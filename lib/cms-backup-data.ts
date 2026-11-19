import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCmsDatabase, withCmsTransaction } from "@/lib/cms-db";
import { getCmsMediaFilePath, isCmsMediaId } from "@/lib/cms-media-storage";

export interface BackupMedia {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  created_at: string;
}

export interface CmsBackupPayload {
  format: "roar-cms-backup";
  version: 3;
  createdAt: string;
  categories: unknown[];
  content: unknown[];
  revisions: unknown[];
  faqs: unknown[];
  settings: unknown[];
  homeSections: unknown[];
  galleryImages: unknown[];
  urlRedirects: unknown[];
  media: BackupMedia[];
  mediaFiles: { filename: string; base64: string }[];
  enquiries: unknown[];
  auditLog: unknown[];
  analyticsEvents: unknown[];
  engagement: unknown[];
  likes: unknown[];
}

export async function getCmsBackupPayload(): Promise<CmsBackupPayload> {
  const database = getCmsDatabase();
  return withCmsTransaction(async () => {
    const media = await database.prepare(
      "SELECT id, filename, url, mime_type, size, width, height, created_at FROM cms_media",
    ).all<BackupMedia>();
    const mediaFiles: CmsBackupPayload["mediaFiles"] = [];
    for (const item of media) {
      if (!isCmsMediaId(item.id)) throw new Error(`Invalid media identifier for ${item.filename}.`);
      const filename = `${item.id}.webp`;
      if (item.url !== `/uploads/${filename}` && item.url !== `/api/media/${item.id}`) {
        throw new Error(`Invalid media storage path for ${item.id}.`);
      }
      let bytes: Buffer;
      try {
        bytes = await readFile(item.url === `/uploads/${filename}`
          ? join(process.cwd(), "public", "uploads", filename)
          : getCmsMediaFilePath(item.id));
      } catch (error) {
        if (item.url !== `/uploads/${filename}` || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        bytes = await readFile(getCmsMediaFilePath(item.id));
      }
      mediaFiles.push({ filename, base64: bytes.toString("base64") });
    }

    const engagementTables = await database.prepare(`
      SELECT
        to_regclass('public.cms_content_engagement') IS NOT NULL AS has_engagement,
        to_regclass('public.cms_content_likes') IS NOT NULL AS has_likes
    `).get() as { has_engagement: boolean; has_likes: boolean };
    const rows = async (sql: string) => database.prepare(sql).all();
    return {
      format: "roar-cms-backup",
      version: 3,
      createdAt: new Date().toISOString(),
      categories: await rows("SELECT id, name, slug, is_default, created_at FROM categories"),
      content: await rows("SELECT * FROM content"),
      revisions: await rows("SELECT id, content_id, snapshot, created_by, created_at FROM cms_revisions"),
      faqs: await rows("SELECT * FROM cms_faqs"),
      settings: await rows("SELECT key, value, updated_at FROM cms_settings"),
      homeSections: await rows("SELECT * FROM cms_home_sections"),
      galleryImages: await rows("SELECT * FROM cms_gallery_images"),
      urlRedirects: await rows("SELECT source_path, content_id, created_at FROM cms_url_redirects"),
      media,
      mediaFiles,
      enquiries: await rows("SELECT id, name, email, phone, source, status, assigned_user_id, follow_up_at, created_at, updated_at FROM cms_enquiries"),
      auditLog: await rows("SELECT id, actor_name, action, resource_type, resource_id, summary, location, created_at FROM cms_audit_log"),
      analyticsEvents: await rows("SELECT id, event_type, page_path, created_at FROM cms_analytics_events"),
      engagement: engagementTables.has_engagement
        ? await rows("SELECT content_id, views, likes, shares, updated_at FROM cms_content_engagement")
        : [],
      likes: engagementTables.has_likes
        ? await rows("SELECT content_id, visitor_id FROM cms_content_likes")
        : [],
    };
  }, "read-only");
}
