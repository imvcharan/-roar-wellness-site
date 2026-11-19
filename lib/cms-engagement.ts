import type { CmsDatabase } from "./cms-db.ts";

export type PostEngagementEvent = "view" | "like" | "share";

export interface PostEngagement {
  views: number;
  likes: number;
  shares: number;
  liked: boolean;
}

let schemaSetup: Promise<void> | undefined;

export async function ensureCmsEngagementTables(database: CmsDatabase): Promise<void> {
  schemaSetup ??= (async () => {
    await database.exec(`
      CREATE TABLE IF NOT EXISTS cms_content_engagement (
        content_id TEXT PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
        views INTEGER NOT NULL DEFAULT 0,
        likes INTEGER NOT NULL DEFAULT 0,
        shares INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    await database.exec(`
      CREATE TABLE IF NOT EXISTS cms_content_likes (
        content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        visitor_id TEXT NOT NULL,
        PRIMARY KEY (content_id, visitor_id)
      )
    `);
  })().catch((error: unknown) => {
    schemaSetup = undefined;
    throw error;
  });
  await schemaSetup;
}

export async function getPostEngagement(
  database: CmsDatabase,
  contentId: string,
  visitorId: string | null = null,
): Promise<PostEngagement> {
  await ensureCmsEngagementTables(database);
  const counts = await database.prepare(`
    SELECT views, likes, shares
    FROM cms_content_engagement
    WHERE content_id = ?
  `).get(contentId) as { views: number; likes: number; shares: number } | undefined;
  const liked = visitorId !== null && await database.prepare(`
    SELECT 1
    FROM cms_content_likes
    WHERE content_id = ? AND visitor_id = ?
  `).get(contentId, visitorId) !== undefined;

  return {
    views: counts?.views ?? 0,
    likes: counts?.likes ?? 0,
    shares: counts?.shares ?? 0,
    liked,
  };
}

export async function recordPostEngagement(
  database: CmsDatabase,
  contentId: string,
  event: PostEngagementEvent,
  visitorId: string | null = null,
): Promise<PostEngagement> {
  await ensureCmsEngagementTables(database);
  if (event === "like") {
    if (!visitorId) throw new Error("A visitor ID is required to record a like.");
    const inserted = await database.prepare(`
      INSERT OR IGNORE INTO cms_content_likes (content_id, visitor_id)
      VALUES (?, ?)
    `).run(contentId, visitorId);

    if (Number(inserted.changes) > 0) {
      await database.prepare(`
        INSERT INTO cms_content_engagement (content_id, likes)
        VALUES (?, 1)
        ON CONFLICT(content_id) DO UPDATE SET
          likes = cms_content_engagement.likes + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `).run(contentId);
    }

    return await getPostEngagement(database, contentId, visitorId);
  }

  const counter = event === "view" ? "views" : "shares";
  await database.prepare(`
    INSERT INTO cms_content_engagement (content_id, ${counter})
    VALUES (?, 1)
    ON CONFLICT(content_id) DO UPDATE SET
      ${counter} = cms_content_engagement.${counter} + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).run(contentId);

  return await getPostEngagement(database, contentId, visitorId);
}
