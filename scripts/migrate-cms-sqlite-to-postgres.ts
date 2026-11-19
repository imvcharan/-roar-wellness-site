import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { Pool, type PoolClient } from "pg";

loadEnvConfig(process.cwd());

type SqliteTable = {
  name: string;
  sql: string;
};

type SqliteColumn = {
  name: string;
};

type SqliteForeignKey = {
  table: string;
};

const timestampDefault = `DEFAULT (to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))`;

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsupported SQLite identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function convertCreateTable(sql: string): string {
  return sql
    .replace(/\bCOLLATE\s+NOCASE\b/gi, "")
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "BIGSERIAL PRIMARY KEY")
    .replace(/\bAUTOINCREMENT\b/gi, "")
    .replace(
      /DEFAULT\s*\(\s*strftime\('%Y-%m-%dT%H:%M:%fZ',\s*'now'\)\s*\)/gi,
      timestampDefault,
    );
}

function convertCreateIndex(sql: string): string {
  return sql
    .replace(/\bemail\s+COLLATE\s+NOCASE\b/gi, "lower(email)")
    .replace(/\bCOLLATE\s+NOCASE\b/gi, "");
}

function getTableOrder(database: DatabaseSync, tables: SqliteTable[]): SqliteTable[] {
  const tableNames = new Set(tables.map(({ name }) => name));
  const dependencies = new Map<string, Set<string>>();

  for (const { name } of tables) {
    const foreignKeys = database.prepare(`PRAGMA foreign_key_list(${quoteIdentifier(name)})`)
      .all() as SqliteForeignKey[];
    dependencies.set(name, new Set(
      foreignKeys.map(({ table }) => table).filter((parent) => tableNames.has(parent)),
    ));
  }

  const ordered: SqliteTable[] = [];
  const pending = new Set(tables.map(({ name }) => name));
  while (pending.size) {
    const ready = [...pending].filter((name) =>
      [...(dependencies.get(name) ?? [])].every((dependency) => !pending.has(dependency)),
    );
    if (!ready.length) {
      throw new Error(`SQLite foreign-key cycle prevents a safe migration: ${[...pending].join(", ")}.`);
    }
    for (const name of ready) {
      pending.delete(name);
      ordered.push(tables.find((table) => table.name === name)!);
    }
  }

  return ordered;
}

async function insertRows(
  client: PoolClient,
  database: DatabaseSync,
  table: string,
  columns: SqliteColumn[],
): Promise<number> {
  const names = columns.map(({ name }) => name);
  const select = database.prepare(`SELECT * FROM ${quoteIdentifier(table)}`);
  const batchSize = Math.max(1, Math.min(250, Math.floor(30_000 / names.length)));
  let batch: Record<string, unknown>[] = [];
  let copied = 0;

  const flush = async () => {
    if (!batch.length) return;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      const placeholders = names.map((name) => {
        values.push(row[name]);
        return `$${values.length}`;
      });
      return `(${placeholders.join(", ")})`;
    });
    await client.query(
      `INSERT INTO ${quoteIdentifier(table)} (${names.map(quoteIdentifier).join(", ")}) VALUES ${tuples.join(", ")}`,
      values,
    );
    copied += batch.length;
    batch = [];
  };

  for (const row of select.iterate() as Iterable<Record<string, unknown>>) {
    batch.push(row);
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  return copied;
}

async function migrate(): Promise<void> {
  const sqlitePath = resolve(process.env.CMS_DATABASE_PATH?.trim() || "data/cms.sqlite");
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite source database was not found at ${sqlitePath}.`);
  }
  const useDatabaseUrl = process.argv.includes("--use-database-url");
  const connectionString = useDatabaseUrl
    ? process.env.DATABASE_URL?.trim()
    : process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(useDatabaseUrl
      ? "Set DATABASE_URL in the environment before running this migration."
      : "Set DIRECT_URL or DATABASE_URL in the environment before running this migration.");
  }
  const apply = process.argv.includes("--apply");
  const confirmNoWrites = process.argv.includes("--confirm-no-writes");

  const source = new DatabaseSync(sqlitePath, { readOnly: true });
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15_000 });
  let client: PoolClient | undefined;

  try {
    const integrity = source.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    if (integrity.integrity_check !== "ok") {
      throw new Error(`SQLite integrity check failed: ${integrity.integrity_check}`);
    }
    const foreignKeyErrors = source.prepare("PRAGMA foreign_key_check").all();
    if (foreignKeyErrors.length) {
      throw new Error(`SQLite contains ${foreignKeyErrors.length} foreign-key violation(s); refusing to migrate.`);
    }

    const tables = source.prepare(`
      SELECT name, sql FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as SqliteTable[];
    if (!tables.length || tables.some((table) => !table.sql)) {
      throw new Error("SQLite source has no migratable CMS tables.");
    }

    const sourceCounts = new Map<string, number>();
    for (const { name } of tables) {
      sourceCounts.set(name, Number(
        (source.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(name)}`).get() as { count: number }).count,
      ));
    }

    const checkDestination = async (queryable: Pick<PoolClient, "query">) => queryable.query<{ tablename: string }>(`
      SELECT tablename FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    if (!apply) {
      const existing = await checkDestination(pool);
      if (existing.rows.length) {
        throw new Error(
          `The PostgreSQL public schema is not empty (${existing.rows.map(({ tablename }) => tablename).join(", ")}). ` +
          "No changes were made. Use a fresh target database for this one-time import.",
        );
      }
      console.info(`Dry run: ${tables.length} SQLite tables are ready to copy from ${sqlitePath}.`);
      for (const { name } of tables) {
        console.info(`${name}: ${sourceCounts.get(name)}`);
      }
      console.info("No PostgreSQL or SQLite data was changed. Add --apply --confirm-no-writes to perform the transfer.");
      return;
    }
    if (!confirmNoWrites) {
      throw new Error("Quiesce CMS writes, then rerun with --confirm-no-writes to avoid missing concurrent changes.");
    }

    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(721946004237)");

    const existing = await checkDestination(client);
    if (existing.rows.length) {
      throw new Error(
        `The PostgreSQL public schema is not empty (${existing.rows.map(({ tablename }) => tablename).join(", ")}). ` +
        "No changes were made. Use a fresh target database for this one-time import.",
      );
    }

    const orderedTables = getTableOrder(source, tables);
    for (const table of orderedTables) {
      await client.query(convertCreateTable(table.sql));
    }

    const copiedCounts = new Map<string, number>();
    for (const { name } of orderedTables) {
      const columns = source.prepare(`PRAGMA table_info(${quoteIdentifier(name)})`)
        .all() as SqliteColumn[];
      copiedCounts.set(name, await insertRows(client, source, name, columns));
    }

    const indexes = source.prepare(`
      SELECT name, sql FROM sqlite_master
      WHERE type = 'index' AND sql IS NOT NULL
      ORDER BY name
    `).all() as SqliteTable[];
    for (const index of indexes) {
      await client.query(convertCreateIndex(index.sql));
    }

    if (tables.some(({ name }) => name === "cms_users")) {
      await client.query(`
        CREATE UNIQUE INDEX cms_users_email_case_insensitive
        ON cms_users (lower(email))
      `);
    }

    const mismatches: string[] = [];
    for (const { name } of tables) {
      const result = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(name)}`,
      );
      const postgresCount = Number(result.rows[0].count);
      const sqliteCount = sourceCounts.get(name)!;
      if (postgresCount !== sqliteCount || copiedCounts.get(name) !== sqliteCount) {
        mismatches.push(`${name}: SQLite=${sqliteCount}, copied=${copiedCounts.get(name)}, PostgreSQL=${postgresCount}`);
      }
    }
    if (mismatches.length) {
      throw new Error(`Row-count verification failed: ${mismatches.join("; ")}`);
    }

    await client.query("COMMIT");
    console.info(`Migrated and verified ${tables.length} SQLite tables.`);
    for (const { name } of tables) {
      console.info(`${name}: ${sourceCounts.get(name)}`);
    }
    console.info("SQLite source was opened read-only and was not changed.");
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("PostgreSQL rollback failed.", rollbackError);
      }
    }
    throw error;
  } finally {
    client?.release();
    source.close();
    await pool.end();
  }
}

void migrate().catch((error: unknown) => {
  console.error("CMS SQLite-to-PostgreSQL migration failed.", error);
  process.exitCode = 1;
});
