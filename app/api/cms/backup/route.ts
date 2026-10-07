import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsMediaDirectory, getCmsMediaFilePath, isCmsMediaId } from "@/lib/cms-media-storage";

export const runtime = "nodejs";

const backupVersion = 1;

export async function GET() {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const database = getCmsDatabase();
  const media = database.prepare("SELECT id, filename, url, mime_type, size, width, height, created_at FROM cms_media").all() as {
    id: string; filename: string; url: string; mime_type: string; size: number;
    width: number; height: number; created_at: string;
  }[];
  const mediaFiles: { filename: string; base64: string }[] = [];
  for (const item of media) {
    if (!isCmsMediaId(item.id)) throw new Error(`Invalid media identifier for ${item.filename}.`);
    const filename = `${item.id}.webp`;
    const isLegacyUrl = item.url === `/uploads/${filename}`;
    if (!isLegacyUrl && item.url !== `/api/media/${item.id}`) throw new Error(`Invalid media storage path for ${item.id}.`);
    let bytes: Buffer;
    try {
      bytes = await readFile(isLegacyUrl ? join(process.cwd(), "public", "uploads", filename) : getCmsMediaFilePath(item.id));
    } catch (error) {
      if (!isLegacyUrl || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      bytes = await readFile(getCmsMediaFilePath(item.id));
    }
    mediaFiles.push({ filename, base64: bytes.toString("base64") });
  }
  const payload = {
    format: "roar-cms-backup",
    version: backupVersion,
    createdAt: new Date().toISOString(),
    categories: database.prepare("SELECT id, name, slug, is_default, created_at FROM categories").all(),
    content: database.prepare("SELECT * FROM content").all(),
    revisions: database.prepare("SELECT id, content_id, snapshot, created_by, created_at FROM cms_revisions").all(),
    faqs: database.prepare("SELECT * FROM cms_faqs").all(),
    settings: database.prepare("SELECT key, value FROM cms_settings").all(),
    homeSections: database.prepare("SELECT * FROM cms_home_sections").all(),
    urlRedirects: database.prepare("SELECT source_path, content_id, created_at FROM cms_url_redirects").all(),
    media,
    mediaFiles,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="roar-cms-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 100 * 1024 * 1024) return NextResponse.json({ error: "Backup file exceeds the 100 MB restore limit." }, { status: 413 });
  let backup: unknown;
  try {
    backup = await request.json();
  } catch {
    return NextResponse.json({ error: "Upload a valid CMS backup JSON file." }, { status: 400 });
  }
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) return NextResponse.json({ error: "Backup must be a JSON object." }, { status: 400 });
  const data = backup as Record<string, unknown>;
  if (data.format !== "roar-cms-backup" || data.version !== backupVersion
    || !Array.isArray(data.categories) || !Array.isArray(data.content)
    || !Array.isArray(data.faqs) || !Array.isArray(data.settings)
    || !Array.isArray(data.media) || !Array.isArray(data.mediaFiles)) {
    return NextResponse.json({ error: "Unsupported backup format or version." }, { status: 400 });
  }

  const database = getCmsDatabase();
  const legacyDirectory = join(process.cwd(), "public", "uploads");
  const written: string[] = [];
  try {
    for (const entry of data.mediaFiles) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Backup includes an invalid media file entry.");
      const file = entry as Record<string, unknown>;
      if (typeof file.filename !== "string" || !/^[0-9a-f-]+\.webp$/i.test(file.filename)
        || typeof file.base64 !== "string" || file.base64.length > 15 * 1024 * 1024) {
        throw new Error("Backup includes an invalid media file.");
      }
      const id = file.filename.slice(0, -5);
      if (!isCmsMediaId(id)) throw new Error("Backup includes an invalid media identifier.");
      const metadata = (data.media as Record<string, unknown>[]).find((item) => item?.id === id);
      if (!metadata || typeof metadata.url !== "string") throw new Error("Backup media file has no matching metadata.");
      const isLegacyUrl = metadata.url === `/uploads/${file.filename}`;
      if (!isLegacyUrl && metadata.url !== `/api/media/${id}`) throw new Error("Backup includes an invalid media storage path.");
      const bytes = Buffer.from(file.base64, "base64");
      const info = await sharp(bytes).metadata();
      if (info.format !== "webp") throw new Error("Backup media must be WebP.");
      const path = isLegacyUrl ? join(legacyDirectory, file.filename) : getCmsMediaFilePath(id);
      await mkdir(isLegacyUrl ? legacyDirectory : getCmsMediaDirectory(), { recursive: true });
      try {
        await writeFile(path, bytes, { flag: "wx" });
        written.push(path);
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      }
    }
  } catch (error) {
    await Promise.all(written.map(async (path) => {
      const { unlink } = await import("node:fs/promises");
      await unlink(path);
    }));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup media could not be restored." }, { status: 400 });
  }

  const categories = data.categories as Record<string, unknown>[];
  const content = data.content as Record<string, unknown>[];
  const faqs = data.faqs as Record<string, unknown>[];
  const settings = data.settings as Record<string, unknown>[];
  const homeSections = Array.isArray(data.homeSections) ? data.homeSections as Record<string, unknown>[] : [];
  const revisions = Array.isArray(data.revisions) ? data.revisions as Record<string, unknown>[] : [];
  const urlRedirects = Array.isArray(data.urlRedirects) ? data.urlRedirects as Record<string, unknown>[] : [];
  const media = data.media as Record<string, unknown>[];
  const text = (value: unknown, fallback: string | null = null): string | null =>
    typeof value === "string" ? value : fallback;
  const number = (value: unknown, fallback = 0): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const statements = {
    category: database.prepare("INSERT INTO categories (id, name, slug, is_default, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, is_default = excluded.is_default"),
    content: database.prepare(`INSERT INTO content (id, title, slug, category_id, excerpt, summary, description, content, image_url, image_alt_text, image_position, status, seo_title, seo_description, seo_keywords, seo_robots, scheduled_publish_at, created_at, updated_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    revision: database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by, created_at) VALUES (?, ?, ?, ?, ?)"),
    urlRedirect: database.prepare("INSERT INTO cms_url_redirects (source_path, content_id, created_at) VALUES (?, ?, ?)"),
    faq: database.prepare("INSERT INTO cms_faqs (id, question, answer, position, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)"),
    setting: database.prepare("INSERT INTO cms_settings (key, value, updated_at) VALUES (?, ?, ?)"),
    home: database.prepare("INSERT INTO cms_home_sections (section_key, group_name, heading, eyebrow, body, image_url, position, is_published, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"),
    media: database.prepare("INSERT INTO cms_media (id, filename, url, mime_type, size, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"),
  };

  try {
    database.exec("BEGIN IMMEDIATE");
    database.exec("DELETE FROM cms_revisions; DELETE FROM cms_url_redirects; DELETE FROM content; DELETE FROM categories WHERE is_default = 0;");
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    await Promise.all(written.map(async (path) => { const { unlink } = await import("node:fs/promises"); await unlink(path); }));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup restore failed." }, { status: 400 });
  }
  try {
    database.exec("DELETE FROM cms_faqs; DELETE FROM cms_settings; DELETE FROM cms_home_sections; DELETE FROM cms_media;");
    const restoredCategories = new Set<string>();
    const restoredContent = new Set<string>();
    for (const row of categories) {
      if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.slug !== "string") throw new Error("Backup contains an invalid category.");
      statements.category.run(row.id, row.name, row.slug, Number(row.is_default) === 1 ? 1 : 0, text(row.created_at, new Date().toISOString()));
      restoredCategories.add(row.id);
    }
    for (const row of content) {
      if (typeof row.id !== "string" || typeof row.title !== "string" || typeof row.slug !== "string"
        || typeof row.category_id !== "string" || !restoredCategories.has(row.category_id)
        || typeof row.status !== "string" || !["draft", "published", "archived"].includes(row.status)) throw new Error("Backup contains invalid or miscategorized content.");
      statements.content.run(row.id, row.title, row.slug, row.category_id, text(row.excerpt), text(row.summary), text(row.description), text(row.content), text(row.image_url), text(row.image_alt_text), text(row.image_position, "50% 50%"), row.status, text(row.seo_title), text(row.seo_description), text(row.seo_keywords), text(row.seo_robots), text(row.scheduled_publish_at), text(row.created_at, new Date().toISOString()), text(row.updated_at, new Date().toISOString()), text(row.published_at));
      restoredContent.add(row.id);
    }
    for (const row of urlRedirects) {
      if (typeof row.source_path !== "string" || !/^\/(?!\/)[a-z0-9%/-]+$/i.test(row.source_path)
        || typeof row.content_id !== "string" || !restoredContent.has(row.content_id)) {
        throw new Error("Backup contains an invalid content URL redirect.");
      }
      statements.urlRedirect.run(row.source_path, row.content_id, text(row.created_at, new Date().toISOString()));
    }
    for (const row of revisions) {
      if (typeof row.id !== "string" || typeof row.content_id !== "string" || !restoredContent.has(row.content_id) || typeof row.snapshot !== "string") {
        throw new Error("Backup contains an invalid content revision.");
      }
      JSON.parse(row.snapshot);
      statements.revision.run(row.id, row.content_id, row.snapshot, text(row.created_by), text(row.created_at, new Date().toISOString()));
    }
    for (const row of faqs) {
      if (typeof row.id !== "string" || typeof row.question !== "string" || typeof row.answer !== "string") throw new Error("Backup contains an invalid FAQ.");
      statements.faq.run(row.id, row.question, row.answer, number(row.position), row.status === "draft" ? "draft" : "published", text(row.updated_at, new Date().toISOString()));
    }
    for (const row of settings) {
      if (typeof row.key !== "string" || typeof row.value !== "string") throw new Error("Backup contains an invalid setting.");
      statements.setting.run(row.key, row.value, text(row.updated_at, new Date().toISOString()));
    }
    for (const row of homeSections) {
      if (typeof row.section_key !== "string" || typeof row.heading !== "string") throw new Error("Backup contains an invalid homepage section.");
      statements.home.run(row.section_key, text(row.group_name, "custom"), row.heading, text(row.eyebrow), text(row.body), text(row.image_url), number(row.position), Number(row.is_published) === 0 ? 0 : 1, text(row.updated_at, new Date().toISOString()));
    }
    for (const row of media) {
      if (typeof row.id !== "string" || !isCmsMediaId(row.id) || typeof row.url !== "string" || typeof row.filename !== "string") throw new Error("Backup contains invalid media metadata.");
      statements.media.run(row.id, row.filename, row.url, text(row.mime_type, "image/webp"), number(row.size), number(row.width), number(row.height), text(row.created_at, new Date().toISOString()));
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    await Promise.all(written.map(async (path) => { const { unlink } = await import("node:fs/promises"); await unlink(path); }));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup restore failed." }, { status: 400 });
  }
  return NextResponse.json({ data: { restored: true, categories: categories.length, content: content.length, revisions: revisions.length, faqs: faqs.length } });
}
