import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadEnvConfig } from "@next/env";
import { Pool, type PoolClient } from "pg";

loadEnvConfig(process.cwd());

type Asset = {
  id: string;
  sourceKind: "cms_upload" | "legacy_upload" | "public_asset";
  sourcePath: string;
  sourceUrls: string[];
  filename: string;
  mimeType: string;
  bytes?: Buffer;
  sha256?: string;
};

type MediaRow = {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
};

const imageMimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};
const textAssetSourceExtensions = new Set([".css", ".html", ".js", ".json", ".mjs", ".ts", ".tsx"]);
const maxAssetBytes = 100 * 1024 * 1024;
const legacyHost = "old.vedicgrace.com";

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsupported SQLite identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function getAssetId(sourceKind: Asset["sourceKind"], sourcePath: string): string {
  return createHash("sha256").update(`${sourceKind}\n${sourcePath}`).digest("hex").slice(0, 32);
}

function getSha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function getConnectionString(): string {
  const useDatabaseUrl = process.argv.includes("--use-database-url");
  const connectionString = useDatabaseUrl
    ? process.env.DATABASE_URL?.trim()
    : process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(useDatabaseUrl
      ? "Set DATABASE_URL in the environment before importing media."
      : "Set DIRECT_URL or DATABASE_URL in the environment before importing media.");
  }
  return connectionString;
}

function addLegacyUploadReferences(text: string, uploads: Map<string, Set<string>>): void {
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
    const rawUrl = match[0].replace(/[),.;]+$/, "").replace(/&#(?:0*39|x0*27);?$/i, "");
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      continue;
    }
    if (!url.pathname.includes("/wp-content/uploads/")) continue;
    const aliases = uploads.get(url.pathname) ?? new Set<string>();
    aliases.add(rawUrl);
    uploads.set(url.pathname, aliases);
  }
}

function addLegacyUploadReferencesFromValue(value: unknown, uploads: Map<string, Set<string>>): void {
  if (typeof value === "string") {
    addLegacyUploadReferences(value, uploads);
  } else if (Array.isArray(value)) {
    for (const item of value) addLegacyUploadReferencesFromValue(item, uploads);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) addLegacyUploadReferencesFromValue(item, uploads);
  }
}

function extractLegacyUploads(database: DatabaseSync): Map<string, Set<string>> {
  const uploads = new Map<string, Set<string>>();
  const tables = database.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as { name: string }[];

  for (const { name: table } of tables) {
    const columns = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`)
      .all() as { name: string }[];
    for (const { name: column } of columns) {
      const rows = database.prepare(
        `SELECT ${quoteIdentifier(column)} AS value FROM ${quoteIdentifier(table)} WHERE ${quoteIdentifier(column)} IS NOT NULL`,
      ).iterate() as Iterable<{ value: unknown }>;
      for (const { value } of rows) {
        if (typeof value === "string") addLegacyUploadReferences(value, uploads);
      }
    }
  }
  return uploads;
}

async function extractLegacyUploadsFromFiles(
  directory: string,
  uploads: Map<string, Set<string>>,
): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await extractLegacyUploadsFromFiles(path, uploads);
      continue;
    }
    const extension = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
    if (!entry.isFile() || !textAssetSourceExtensions.has(extension)) continue;
    const text = await readFile(path, "utf8");
    if (extension === ".json") {
      try {
        addLegacyUploadReferencesFromValue(JSON.parse(text) as unknown, uploads);
      } catch {
        addLegacyUploadReferences(text, uploads);
      }
    } else {
      addLegacyUploadReferences(text, uploads);
    }
  }
}

async function collectPublicAssets(directory: string, root: string): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...await collectPublicAssets(path, root));
      continue;
    }
    if (!entry.isFile()) continue;
    const extension = entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase();
    const mimeType = imageMimeTypes[extension];
    if (!mimeType) continue;
    const sourcePath = relative(root, path).replace(/\\/g, "/");
    const bytes = await readFile(path);
    if (!bytes.length || bytes.length > maxAssetBytes) {
      throw new Error(`Invalid public image size for ${sourcePath}: ${bytes.length} bytes.`);
    }
    assets.push({
      id: getAssetId("public_asset", sourcePath),
      sourceKind: "public_asset",
      sourcePath,
      sourceUrls: [`/${sourcePath}`],
      filename: entry.name,
      mimeType,
      bytes,
      sha256: getSha256(bytes),
    });
  }
  return assets;
}

async function collectAssets(): Promise<Asset[]> {
  const databasePath = resolve(process.env.CMS_DATABASE_PATH?.trim() || "data/cms.sqlite");
  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    const mediaRows = database.prepare(`
      SELECT id, filename, url, mime_type, size FROM cms_media ORDER BY id
    `).all() as MediaRow[];
    const directory = resolve(process.env.CMS_MEDIA_DIRECTORY?.trim() || "data/media");
    const files = await readdir(directory, { withFileTypes: true });
    const fileNames = new Set(files.filter((file) => file.isFile()).map((file) => file.name));
    if (files.some((file) => !file.isFile()) || fileNames.size !== mediaRows.length) {
      throw new Error("The CMS media directory does not exactly match the SQLite media records.");
    }

    const assets: Asset[] = [];
    for (const row of mediaRows) {
      if (!/^[0-9a-f-]{36}$/i.test(row.id)) {
        throw new Error(`Unsupported CMS media identifier: ${row.id}`);
      }
      const filename = `${row.id}.webp`;
      if (!fileNames.delete(filename)) {
        throw new Error(`CMS media file is missing: ${filename}`);
      }
      const bytes = await readFile(join(directory, filename));
      if (!bytes.length || bytes.length !== row.size) {
        throw new Error(`CMS media size mismatch for ${filename}: database=${row.size}, file=${bytes.length}.`);
      }
      assets.push({
        id: getAssetId("cms_upload", row.id),
        sourceKind: "cms_upload",
        sourcePath: row.id,
        sourceUrls: [row.url],
        filename: row.filename,
        mimeType: row.mime_type,
        bytes,
        sha256: getSha256(bytes),
      });
    }

    const uploads = extractLegacyUploads(database);
    for (const directory of ["app", "components", "lib", "data"]) {
      await extractLegacyUploadsFromFiles(resolve(directory), uploads);
    }
    for (const [sourcePath, aliases] of uploads) {
      const pathname = sourcePath.replace(/\\/g, "/");
      assets.push({
        id: getAssetId("legacy_upload", pathname),
        sourceKind: "legacy_upload",
        sourcePath: pathname,
        sourceUrls: [...aliases].sort(),
        filename: pathname.slice(pathname.lastIndexOf("/") + 1),
        mimeType: imageMimeTypes[pathname.slice(pathname.lastIndexOf(".")).toLowerCase()] || "image/jpeg",
      });
    }
    assets.push(...await collectPublicAssets(resolve("public"), resolve("public")));
    if (fileNames.size) {
      throw new Error(`CMS media directory has unreferenced file(s): ${[...fileNames].join(", ")}.`);
    }
    return assets;
  } finally {
    database.close();
  }
}

async function downloadAsset(asset: Asset): Promise<Asset> {
  const url = new URL(`https://${legacyHost}${asset.sourcePath}`);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
        redirect: "follow",
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} for ${asset.sourcePath}.`);
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else {
        if (new URL(response.url).hostname !== legacyHost) {
          throw new Error(`Unexpected redirect host while downloading ${asset.sourcePath}.`);
        }
        const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
        if (!mimeType?.startsWith("image/")) {
          throw new Error(`Unexpected content type for ${asset.sourcePath}: ${mimeType || "missing"}.`);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!bytes.length || bytes.length > maxAssetBytes) {
          throw new Error(`Invalid image size for ${asset.sourcePath}: ${bytes.length} bytes.`);
        }
        const contentLength = Number(response.headers.get("content-length"));
        if (!response.headers.get("content-encoding") && Number.isFinite(contentLength) &&
          contentLength > 0 && contentLength !== bytes.length) {
          throw new Error(`Content length mismatch for ${asset.sourcePath}: expected ${contentLength}, received ${bytes.length}.`);
        }
        return { ...asset, mimeType, bytes, sha256: getSha256(bytes) };
      }
    } catch (error) {
      if (error instanceof Error) {
        const statusMatch = error.message.match(/^HTTP (\d+)/);
        const status = statusMatch ? Number(statusMatch[1]) : undefined;
        if ((status !== undefined && status < 500 && status !== 429) ||
          error.message.startsWith("Unexpected") ||
          error.message.startsWith("Invalid") ||
          error.message.startsWith("Content length")) {
          throw error;
        }
      }
      lastError = error;
    }
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
  const reason = lastError instanceof Error ? ` ${lastError.message}` : "";
  throw new Error(`Unable to download ${asset.sourcePath} after 4 attempts.${reason}`, { cause: lastError });
}

async function downloadLegacyAssets(assets: Asset[]): Promise<Asset[]> {
  const legacyIndices = assets
    .map((asset, index) => asset.sourceKind === "legacy_upload" ? index : -1)
    .filter((index) => index >= 0);
  let next = 0;
  const failures: string[] = [];
  async function worker() {
    while (next < legacyIndices.length) {
      const index = legacyIndices[next++];
      try {
        assets[index] = await downloadAsset(assets[index]);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  await worker();
  if (failures.length) {
    throw new Error(`Could not download ${failures.length} referenced legacy image(s):\n${failures.join("\n")}`);
  }
  return assets;
}

async function createAssetsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS site_media_assets (
      asset_id CHAR(32) PRIMARY KEY,
      source_kind TEXT NOT NULL CHECK (source_kind IN ('cms_upload', 'legacy_upload', 'public_asset')),
      source_path TEXT NOT NULL,
      source_urls TEXT[] NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
      sha256 CHAR(64) NOT NULL,
      content BYTEA NOT NULL,
      imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (octet_length(content) = size_bytes)
    )
  `);
}

async function verifyAssets(client: PoolClient, assets: Asset[]): Promise<number> {
  const batches: Asset[][] = [];
  let batch: Asset[] = [];
  let batchBytes = 0;
  for (const asset of assets) {
    const size = asset.bytes?.length || 0;
    if (batch.length && (batch.length >= 8 || batchBytes + size > 1_500_000)) {
      batches.push(batch);
      batch = [];
      batchBytes = 0;
    }
    batch.push(asset);
    batchBytes += size;
  }
  if (batch.length) batches.push(batch);

  const mismatches: string[] = [];
  let actualCount = 0;
  let verifiedBytes = 0;
  for (const currentBatch of batches) {
    const result = await client.query<{
      asset_id: string;
      size_bytes: string;
      sha256: string;
      content: Buffer;
    }>(`
      SELECT asset_id, size_bytes::text, sha256, content
      FROM site_media_assets
      WHERE asset_id = ANY($1::char(32)[])
    `, [currentBatch.map(({ id }) => id)]);
    const actual = new Map<string, (typeof result.rows)[number]>();
    for (const row of result.rows) {
      actual.set(row.asset_id.trim(), row);
    }
    actualCount += actual.size;
    for (const asset of currentBatch) {
      const row = actual.get(asset.id);
      if (!row || !asset.bytes || !asset.sha256) {
        mismatches.push(`${asset.sourcePath}: missing bytes or database row`);
        continue;
      }
      const storedHash = getSha256(row.content);
      if (Number(row.size_bytes) !== asset.bytes.length || row.sha256.trim() !== asset.sha256 ||
        row.content.length !== asset.bytes.length || storedHash !== asset.sha256) {
        mismatches.push(`${asset.sourcePath}: PostgreSQL byte/hash mismatch`);
      } else {
        verifiedBytes += row.content.length;
      }
    }
  }
  if (actualCount !== assets.length || mismatches.length) {
    throw new Error(`PostgreSQL media verification failed (${actualCount}/${assets.length} rows): ${mismatches.join("; ")}`);
  }
  return verifiedBytes;
}

async function main(): Promise<void> {
  const assets = await collectAssets();
  const duplicateIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const asset of assets) {
    if (seenIds.has(asset.id)) duplicateIds.add(asset.id);
    seenIds.add(asset.id);
  }
  if (duplicateIds.size) {
    throw new Error(`Asset identifiers are not unique: ${[...duplicateIds].join(", ")}.`);
  }

  const byKind = new Map<string, number>();
  for (const asset of assets) byKind.set(asset.sourceKind, (byKind.get(asset.sourceKind) || 0) + 1);
  console.info(`Inventory: ${[...byKind].map(([kind, count]) => `${kind}=${count}`).join(", ")}.`);
  if (!process.argv.includes("--apply")) {
    console.info("Dry run only. No files or database rows were changed. Add --apply to import.");
    return;
  }

  for (const asset of assets.filter(({ sourceKind }) => sourceKind !== "legacy_upload")) {
    if (!asset.bytes || !asset.sha256) {
      throw new Error(`Local asset was not read: ${asset.sourcePath}.`);
    }
  }
  await downloadLegacyAssets(assets);
  const incomplete = assets.filter((asset) => !asset.bytes || !asset.sha256);
  if (incomplete.length) {
    throw new Error(`Missing bytes for ${incomplete.length} asset(s): ${incomplete.map(({ sourcePath }) => sourcePath).join(", ")}.`);
  }
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes!.length, 0);
  console.info(`Downloaded and hashed ${assets.length} assets (${totalBytes} bytes).`);

  const pool = new Pool({ connectionString: getConnectionString(), max: 1, connectionTimeoutMillis: 15_000 });
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(721946004238)");
    await createAssetsTable(client);
    for (const asset of assets) {
      await client.query(`
        INSERT INTO site_media_assets
          (asset_id, source_kind, source_path, source_urls, filename, mime_type, size_bytes, sha256, content)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (asset_id) DO UPDATE SET
          source_kind = EXCLUDED.source_kind,
          source_path = EXCLUDED.source_path,
          source_urls = EXCLUDED.source_urls,
          filename = EXCLUDED.filename,
          mime_type = EXCLUDED.mime_type,
          size_bytes = EXCLUDED.size_bytes,
          sha256 = EXCLUDED.sha256,
          content = EXCLUDED.content,
          imported_at = now()
      `, [
        asset.id,
        asset.sourceKind,
        asset.sourcePath,
        asset.sourceUrls,
        asset.filename,
        asset.mimeType,
        asset.bytes!.length,
        asset.sha256,
        asset.bytes,
      ]);
    }
    const verifiedBytes = await verifyAssets(client, assets);
    await client.query("COMMIT");
    console.info(`Imported and SHA-256 verified ${assets.length} media assets (${verifiedBytes} bytes) in PostgreSQL.`);
    console.info("SQLite and public source files were not modified.");
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
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error("PostgreSQL media asset import failed.", error);
  process.exitCode = 1;
});
