import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { getCmsContentImage } from "@/lib/cms-content-image";
import { getCmsMediaFilePath, isCmsMediaId } from "@/lib/cms-media-storage";
import { normalizeCmsBlogHtml } from "@/lib/cms-validation";

export interface CmsCategory {
  id: string;
  name: string;
  slug: string;
  is_default: number;
  created_at: string;
}

export interface CmsContent {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  excerpt: string | null;
  summary: string | null;
  description: string | null;
  content: string | null;
  image_url: string | null;
  image_alt_text: string | null;
  image_position: string;
  status: "draft" | "published" | "archived";
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_robots: string | null;
  seo_canonical_url: string | null;
  seo_og_title: string | null;
  seo_og_description: string | null;
  seo_og_image: string | null;
  seo_twitter_title: string | null;
  seo_twitter_description: string | null;
  seo_twitter_image: string | null;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

interface CmsQueryResult<Row> {
  rows: Row[];
  changes: number;
}

export interface CmsDatabase {
  prepare(sql: string): {
    all<Row extends QueryResultRow = QueryResultRow>(...values: unknown[]): Promise<Row[]>;
    get<Row extends QueryResultRow = QueryResultRow>(...values: unknown[]): Promise<Row | undefined>;
    run(...values: unknown[]): Promise<{ changes: number }>;
  };
  exec(sql: string): Promise<void>;
  query<Row extends QueryResultRow = QueryResultRow>(
    sql: string,
    values?: unknown[],
  ): Promise<CmsQueryResult<Row>>;
}

type CmsGlobal = typeof globalThis & {
  roarCmsPool?: Pool;
  roarCmsDatabase?: CmsDatabase;
};

const globalCms = globalThis as CmsGlobal;
const transactionContext = new AsyncLocalStorage<PoolClient>();
types.setTypeParser(20, (value) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("PostgreSQL integer value exceeds JavaScript's safe integer range.");
  return parsed;
});

function convertPlaceholders(sql: string): string {
  let output = "";
  let parameter = 0;
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    if (quote) {
      output += character;
      if (character === quote) {
        if (sql[index + 1] === quote) {
          output += sql[index + 1];
          index += 1;
        } else {
          quote = null;
        }
      }
    } else if (character === "'" || character === '"') {
      quote = character;
      output += character;
    } else if (character === "?") {
      parameter += 1;
      output += `$${parameter}`;
    } else {
      output += character;
    }
  }
  return output;
}

function convertSql(sql: string): string {
  const ignoreConflicts = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);
  let converted = sql
    .replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO")
    .replace(/\b([A-Za-z_][A-Za-z0-9_.]*)\s+COLLATE\s+NOCASE\b/gi, "lower($1)")
    .replace(
      /strftime\('%Y-%m-%dT%H:%M:%fZ',\s*'now'(?:,\s*'([+-]\d+)\s+(months?|days?|hours?|minutes?)')?\)/gi,
      (_match, amount?: string, unit?: string) => {
        const time = amount && unit
          ? `(clock_timestamp() ${amount.startsWith("-") ? "-" : "+"} INTERVAL '${Math.abs(Number(amount))} ${unit.replace(/s$/, "")}')`
          : "clock_timestamp()";
        return `to_char(${time} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
      },
    );
  converted = convertPlaceholders(converted);
  if (ignoreConflicts) {
    const returningAt = converted.search(/\bRETURNING\b/i);
    if (returningAt >= 0) {
      converted = `${converted.slice(0, returningAt).trimEnd()} ON CONFLICT DO NOTHING ${converted.slice(returningAt)}`;
    } else {
      converted = `${converted.trimEnd()} ON CONFLICT DO NOTHING`;
    }
  }
  return converted;
}

function getPool(): Pool {
  if (!globalCms.roarCmsPool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) throw new Error("DATABASE_URL must be configured for the PostgreSQL CMS.");
    globalCms.roarCmsPool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalCms.roarCmsPool;
}

function createDatabase(): CmsDatabase {
  const query = async <Row extends QueryResultRow>(
    sql: string,
    values: unknown[] = [],
  ): Promise<CmsQueryResult<Row>> => {
    const client = transactionContext.getStore();
    const result = await (client ?? getPool()).query<Row>(convertSql(sql), values);
    return { rows: result.rows, changes: result.rowCount ?? 0 };
  };

  return {
    query,
    async exec(sql) {
      await query(sql);
    },
    prepare(sql) {
      return {
        all: async <Row extends QueryResultRow = QueryResultRow>(...values: unknown[]) =>
          (await query<Row>(sql, values)).rows,
        get: async <Row extends QueryResultRow = QueryResultRow>(...values: unknown[]) =>
          (await query<Row>(sql, values)).rows[0],
        run: async (...values: unknown[]) => ({ changes: (await query(sql, values)).changes }),
      };
    },
  };
}

export function getCmsDatabase(): CmsDatabase {
  if (!globalCms.roarCmsDatabase) globalCms.roarCmsDatabase = createDatabase();
  return globalCms.roarCmsDatabase;
}

export async function closeCmsDatabase(): Promise<void> {
  await globalCms.roarCmsPool?.end();
  globalCms.roarCmsPool = undefined;
  globalCms.roarCmsDatabase = undefined;
}

export function isCmsUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && error.code === "23505";
}

export function isCmsForeignKeyViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error
    && error.code === "23503";
}

export async function withCmsTransaction<T>(
  action: () => Promise<T>,
  mode: "read-write" | "read-only" = "read-write",
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query(mode === "read-only" ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN");
    const result = await transactionContext.run(client, action);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("PostgreSQL transaction rollback failed.", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listCategories(): Promise<CmsCategory[]> {
  return await getCmsDatabase().prepare(
    "SELECT id, name, slug, is_default, created_at FROM categories ORDER BY is_default DESC, lower(name)",
  ).all<CmsCategory>();
}

export async function findCategory(id: string): Promise<CmsCategory | undefined> {
  return await getCmsDatabase().prepare(
    "SELECT id, name, slug, is_default, created_at FROM categories WHERE id = ?",
  ).get<CmsCategory>(id);
}

const contentSelect = `
  SELECT c.id, c.title, c.slug, c.category_id, cat.name AS category_name,
    cat.slug AS category_slug, c.excerpt, c.summary, c.description, c.content,
    c.image_url, c.image_alt_text, c.image_position, c.status, c.seo_title, c.seo_description, c.seo_keywords, c.seo_robots,
    c.seo_canonical_url, c.seo_og_title, c.seo_og_description, c.seo_og_image,
    c.seo_twitter_title, c.seo_twitter_description, c.seo_twitter_image, c.scheduled_publish_at,
    c.created_at, c.updated_at, c.published_at
  FROM content c JOIN categories cat ON cat.id = c.category_id
`;

export async function listContent(options: {
  includeUnpublished?: boolean;
  categoryId?: string;
  categorySlug?: string;
} = {}): Promise<CmsContent[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  if (!options.includeUnpublished) clauses.push("c.status = 'published'");
  if (options.categoryId) {
    clauses.push("c.category_id = ?");
    values.push(options.categoryId);
  }
  if (options.categorySlug) {
    clauses.push("cat.slug = ?");
    values.push(options.categorySlug);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const database = getCmsDatabase();
  return await database.prepare(`${contentSelect} ${where} ORDER BY c.updated_at DESC, lower(c.title)`)
    .all<CmsContent>(...values);
}

export async function getCmsSettings(): Promise<Record<string, string>> {
  const rows = await getCmsDatabase().prepare("SELECT key, value FROM cms_settings").all<{
    key: string;
    value: string;
  }>();
  return Object.fromEntries(rows.map(({ key, value }) => [key, value]));
}

export async function recordContentRevision(contentId: string, createdBy: string | null): Promise<void> {
  const item = await findContentById(contentId);
  if (!item) return;
  await getCmsDatabase().prepare(
    "INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)",
  ).run(randomUUID(), contentId, JSON.stringify(item), createdBy);
}

export async function findContentBySlug(slug: string, includeUnpublished = false): Promise<CmsContent | undefined> {
  const statusClause = includeUnpublished ? "" : "AND c.status = 'published'";
  return await getCmsDatabase().prepare(`${contentSelect} WHERE c.slug = ? ${statusClause}`)
    .get<CmsContent>(slug);
}

export async function findContentById(id: string): Promise<CmsContent | undefined> {
  return await getCmsDatabase().prepare(`${contentSelect} WHERE c.id = ?`).get<CmsContent>(id);
}

export async function findPublishedContentRedirect(sourcePath: string): Promise<CmsContent | undefined> {
  return await getCmsDatabase().prepare(`${contentSelect}
    JOIN cms_url_redirects redirect ON redirect.content_id = c.id
    WHERE redirect.source_path = ? AND c.status = 'published'`)
    .get<CmsContent>(sourcePath);
}

export function toPublicContent(item: CmsContent) {
  return {
    ...item,
    featured_image_url: item.image_url,
    featured_image_alt: item.image_alt_text,
    featured_image_position: item.image_position,
  };
}

function hasLocalCmsMediaFile(imageUrl: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(imageUrl, "https://cms.local").pathname;
  } catch {
    return true;
  }

  const mediaId = pathname.match(/^\/api\/media\/([0-9a-f-]+)$/i)?.[1];
  if (mediaId && isCmsMediaId(mediaId)) return existsSync(getCmsMediaFilePath(mediaId));

  const legacyMediaId = pathname.match(/^\/uploads\/([0-9a-f-]+)\.webp$/i)?.[1];
  if (legacyMediaId && isCmsMediaId(legacyMediaId)) {
    return existsSync(join(process.cwd(), "public", "uploads", `${legacyMediaId}.webp`));
  }

  return true;
}

function getLocalBlogImage(slug: string): string | null {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const imagePath = `/images/blog/${slug}.webp`;
  return existsSync(join(process.cwd(), "public", imagePath.slice(1))) ? imagePath : null;
}

export function toPublicBlogContent(item: CmsContent) {
  const sourceImage = item.image_url || getCmsContentImage(item.content);
  const localFallback = getLocalBlogImage(item.slug);
  const imageUrl = sourceImage && hasLocalCmsMediaFile(sourceImage)
    ? sourceImage
    : localFallback || sourceImage;
  return {
    ...toPublicContent(item),
    description: normalizeCmsBlogHtml(item.description),
    content: normalizeCmsBlogHtml(item.content),
    image_url: imageUrl,
    featured_image_url: imageUrl,
  };
}
