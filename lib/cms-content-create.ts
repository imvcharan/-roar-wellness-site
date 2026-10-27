import type { DatabaseSync } from "node:sqlite";
import type { CmsContentInput } from "./cms-validation.ts";

export function insertCmsContent(database: DatabaseSync, id: string, input: CmsContentInput): void {
  database.prepare(`
    INSERT INTO content (
      id, title, slug, category_id, excerpt, summary, description, content,
      image_url, image_alt_text, image_position, status, seo_title, seo_description, seo_keywords, seo_robots,
      seo_canonical_url, seo_og_title, seo_og_description, seo_og_image,
      seo_twitter_title, seo_twitter_description, seo_twitter_image, scheduled_publish_at, published_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END)
  `).run(
    id, input.title, input.slug, input.categoryId, input.excerpt, input.summary,
    input.description, input.content, input.imageUrl, input.imageAltText, input.imagePosition, input.status, input.seoTitle,
    input.seoDescription, input.seoKeywords, input.seoRobots, input.seoCanonicalUrl,
    input.seoOgTitle, input.seoOgDescription, input.seoOgImage,
    input.seoTwitterTitle, input.seoTwitterDescription, input.seoTwitterImage,
    input.scheduledPublishAt, input.status,
  );
}
