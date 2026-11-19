import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { after, describe, it } from "node:test";
import { closeCmsDatabase, getCmsDatabase } from "../lib/cms-db.ts";
import { listCmsContentRevisions } from "../lib/cms-content-revisions.ts";
import { insertCmsContent } from "../lib/cms-content-create.ts";
import { parseCmsContentInput } from "../lib/cms-validation.ts";

const originalDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.CMS_TEST_DATABASE_URL;
let schema: string | null = null;
let adminPool: Pool | undefined;

after(async () => {
  await closeCmsDatabase();
  if (schema && adminPool) await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
  await adminPool?.end();
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("PostgreSQL CMS compatibility", () => {
  it("lists distinct content revisions using PostgreSQL JSON and deterministic ordering", {
    skip: !testDatabaseUrl,
  }, async () => {
    schema = `cms_test_${randomUUID().replace(/-/g, "")}`;
    adminPool = new Pool({ connectionString: testDatabaseUrl, max: 1 });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    const isolatedUrl = new URL(testDatabaseUrl!);
    isolatedUrl.searchParams.set("options", `-c search_path=${schema},public`);
    process.env.DATABASE_URL = isolatedUrl.toString();

    const database = getCmsDatabase();
    await database.exec(`
      CREATE TABLE cms_users (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE cms_revisions (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        snapshot TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL
      )
      ;
      CREATE TABLE content (
        id TEXT PRIMARY KEY, title TEXT, slug TEXT, category_id TEXT, excerpt TEXT, summary TEXT,
        description TEXT, content TEXT, image_url TEXT, image_alt_text TEXT, image_position TEXT,
        status TEXT, seo_title TEXT, seo_description TEXT, seo_keywords TEXT, seo_robots TEXT,
        seo_canonical_url TEXT, seo_og_title TEXT, seo_og_description TEXT, seo_og_image TEXT,
        seo_twitter_title TEXT, seo_twitter_description TEXT, seo_twitter_image TEXT,
        scheduled_publish_at TEXT, published_at TEXT, updated_at TEXT
      )
    `);
    await database.prepare("INSERT INTO cms_users (id, name) VALUES (?, ?)").run("user-1", "Editor");
    const insertRevision = database.prepare(`
      INSERT INTO cms_revisions (id, content_id, snapshot, created_by, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    await insertRevision.run("rev-a", "content-1", '{"title":"Original","status":"draft"}', "user-1", "2026-01-01T00:00:00.000Z");
    await insertRevision.run("rev-b", "content-1", '{"title":"Repeated","status":"draft"}', "user-1", "2026-01-02T00:00:00.000Z");
    await insertRevision.run("rev-c", "content-1", '{"title":"Repeated","status":"draft"}', "user-1", "2026-01-02T00:00:00.000Z");
    await insertRevision.run("rev-d", "content-1", '{"title":"Second","status":"published"}', "user-1", "2026-01-03T00:00:00.000Z");

    const revisions = await listCmsContentRevisions(database, "content-1") as {
      id: string;
      title: string;
      status: string;
      created_by: string;
    }[];

    assert.deepEqual(revisions.map(({ id, title, status }) => ({ id, title, status })), [
      { id: "rev-d", title: "Second", status: "published" },
      { id: "rev-b", title: "Repeated", status: "draft" },
      { id: "rev-a", title: "Original", status: "draft" },
    ]);
    assert.equal(revisions[0].created_by, "Editor");

    await insertCmsContent(database, "content-crud", parseCmsContentInput({
      title: "PostgreSQL CRUD check",
      categoryId: "services",
      status: "published",
    }));
    const created = await database.prepare("SELECT title, slug, published_at FROM content WHERE id = ?")
      .get("content-crud") as { title: string; slug: string; published_at: string | null } | undefined;
    assert.deepEqual(created && { title: created.title, slug: created.slug }, {
      title: "PostgreSQL CRUD check",
      slug: "postgresql-crud-check",
    });
    assert.ok(created?.published_at);

    const updated = await database.prepare(`
      UPDATE content SET title = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
    `).run("Updated PostgreSQL CRUD check", "content-crud");
    assert.equal(updated.changes, 1);
    assert.equal((await database.prepare("SELECT title FROM content WHERE id = ?").get("content-crud") as { title: string }).title,
      "Updated PostgreSQL CRUD check");

    const deleted = await database.prepare("DELETE FROM content WHERE id = ?").run("content-crud");
    assert.equal(deleted.changes, 1);
    assert.equal(await database.prepare("SELECT id FROM content WHERE id = ?").get("content-crud"), undefined);
  });
});
