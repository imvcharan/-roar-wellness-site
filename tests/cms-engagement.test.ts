import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { getPostEngagement, recordPostEngagement } from "../lib/cms-engagement.ts";
import type { CmsDatabase } from "../lib/cms-db.ts";

function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE content (id TEXT PRIMARY KEY);
    CREATE TABLE cms_content_engagement (
      content_id TEXT PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE cms_content_likes (
      content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      visitor_id TEXT NOT NULL,
      PRIMARY KEY (content_id, visitor_id)
    );
    INSERT INTO content (id) VALUES ('post-1');
  `);
  return database;
}

describe("CMS post engagement", () => {
  it("increments views and shares for completed article actions", async () => {
    const database = createDatabase();
    await recordPostEngagement(database as unknown as CmsDatabase, "post-1", "view");
    const counts = await recordPostEngagement(database as unknown as CmsDatabase, "post-1", "share");

    assert.equal(counts.views, 1);
    assert.equal(counts.likes, 0);
    assert.equal(counts.shares, 1);
    database.close();
  });

  it("counts one like per anonymous visitor and reports the visitor's state", async () => {
    const database = createDatabase();
    await recordPostEngagement(database as unknown as CmsDatabase, "post-1", "like", "visitor-1");
    await recordPostEngagement(database as unknown as CmsDatabase, "post-1", "like", "visitor-1");
    const secondVisitorCounts = await recordPostEngagement(database as unknown as CmsDatabase, "post-1", "like", "visitor-2");

    assert.equal(secondVisitorCounts.likes, 2);
    assert.equal((await getPostEngagement(database as unknown as CmsDatabase, "post-1", "visitor-1")).liked, true);
    assert.equal((await getPostEngagement(database as unknown as CmsDatabase, "post-1", "visitor-3")).liked, false);
    database.close();
  });
});
