import { NextResponse } from "next/server";
import { canEditCms, getCmsRole, getCmsUserId } from "@/lib/cms-auth";
import {
  findCategory,
  getCmsDatabase,
  listContent,
  toPublicContent,
} from "@/lib/cms-db";
import { getCmsContentHref, isPageCategory } from "@/lib/cms-routes";
import { isReservedCmsPageSlug, parseCmsContentInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeUnpublished = url.searchParams.get("all") === "1";
  if (includeUnpublished && !await getCmsRole()) {
    return NextResponse.json({ error: "Sign in to view draft and archived content." }, { status: 401 });
  }
  const categoryId = url.searchParams.get("categoryId") || undefined;
  const categorySlug = url.searchParams.get("category") || undefined;
  return NextResponse.json({
    data: listContent({ includeUnpublished, categoryId, categorySlug }).map(toPublicContent),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to create CMS content." }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  let input: ReturnType<typeof parseCmsContentInput>;
  try {
    input = parseCmsContentInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid content." }, { status: 400 });
  }
  const category = findCategory(input.categoryId);
  if (!category) {
    return NextResponse.json({ error: "The selected category does not exist." }, { status: 400 });
  }
  if (isPageCategory(category.slug) && isReservedCmsPageSlug(input.slug)) {
    return NextResponse.json({ error: "This slug is reserved for a built-in website route. Choose another slug." }, { status: 400 });
  }

  const database = getCmsDatabase();
  const id = crypto.randomUUID();
  const createdBy = await getCmsUserId();
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare(`
      INSERT INTO content (
        id, title, slug, category_id, excerpt, summary, description, content,
        image_url, image_alt_text, image_position, status, seo_title, seo_description, seo_keywords, seo_robots, scheduled_publish_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'published' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE NULL END)
    `).run(
      id, input.title, input.slug, input.categoryId, input.excerpt, input.summary,
      input.description, input.content, input.imageUrl, input.imageAltText, input.imagePosition, input.status, input.seoTitle,
      input.seoDescription, input.seoKeywords, input.seoRobots, input.scheduledPublishAt, input.status,
    );
    database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(getCmsContentHref(input.slug, category.slug));
    const item = listContent({ includeUnpublished: true }).find((entry) => entry.id === id);
    database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
      .run(crypto.randomUUID(), id, JSON.stringify(item), createdBy);
    database.exec("COMMIT");
    return NextResponse.json({ data: item && toPublicContent(item) }, { status: 201 });
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A content item with that slug already exists." }, { status: 409 });
    }
    throw error;
  }
}
