import type { CmsDatabase } from "@/lib/cms-db";

export async function listCmsContentRevisions(database: CmsDatabase, contentId: string) {
  return database.prepare(`
    SELECT r.id, r.content_id, r.created_at, u.name AS created_by,
      r.snapshot::jsonb ->> 'title' AS title,
      r.snapshot::jsonb ->> 'status' AS status
    FROM cms_revisions r LEFT JOIN cms_users u ON u.id = r.created_by
    WHERE r.content_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM cms_revisions older
        WHERE older.content_id = r.content_id
          AND older.snapshot = r.snapshot
          AND (
            older.created_at < r.created_at
            OR (older.created_at = r.created_at AND older.id < r.id)
          )
      )
    ORDER BY r.created_at DESC, r.id DESC
  `).all(contentId);
}
