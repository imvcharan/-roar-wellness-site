import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { insertCmsContent } from "../lib/cms-content-create.ts";
import { parseCmsContentInput } from "../lib/cms-validation.ts";

describe("CMS content creation SQL", () => {
  it("inserts all content fields and sets publication time only for published content", () => {
    const database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE content (
        id TEXT PRIMARY KEY, title TEXT, slug TEXT, category_id TEXT, excerpt TEXT, summary TEXT,
        description TEXT, content TEXT, image_url TEXT, image_alt_text TEXT, image_position TEXT,
        status TEXT, seo_title TEXT, seo_description TEXT, seo_keywords TEXT, seo_robots TEXT,
        seo_canonical_url TEXT, seo_og_title TEXT, seo_og_description TEXT, seo_og_image TEXT,
        seo_twitter_title TEXT, seo_twitter_description TEXT, seo_twitter_image TEXT,
        scheduled_publish_at TEXT, published_at TEXT
      )
    `);
    const draft = parseCmsContentInput({
      title: "Draft page",
      categoryId: "category-id",
      status: "draft",
      seoTitle: "Draft SEO title",
      seoDescription: "Draft description",
    });
    const published = parseCmsContentInput({
      title: "Published page",
      categoryId: "category-id",
      status: "published",
    });

    insertCmsContent(database, "draft-id", draft);
    insertCmsContent(database, "published-id", published);

    const draftRow = database.prepare("SELECT * FROM content WHERE id = ?").get("draft-id") as {
      title: string;
      slug: string;
      seo_title: string;
      published_at: string | null;
    };
    const publishedRow = database.prepare("SELECT * FROM content WHERE id = ?").get("published-id") as {
      published_at: string | null;
    };
    assert.equal(draftRow.title, "Draft page");
    assert.equal(draftRow.slug, "draft-page");
    assert.equal(draftRow.seo_title, "Draft SEO title");
    assert.equal(draftRow.published_at, null);
    assert.ok(publishedRow.published_at);
    database.close();
  });
});
