import { NextResponse } from "next/server";
import { canEditCms, getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import {
  findCategory,
  findContentById,
  getCmsDatabase,
  toPublicContent,
} from "@/lib/cms-db";
import { getCmsContentHref, isPageCategory } from "@/lib/cms-routes";
import { isReservedCmsPageSlug, parseCmsContentInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to update CMS content." }, { status: 401 });
  }
  const { id } = await params;
  const previous = findContentById(id);
  if (!previous) return NextResponse.json({ error: "Content not found." }, { status: 404 });
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
  const previousPath = getCmsContentHref(previous.slug, previous.category_slug);
  const nextPath = getCmsContentHref(input.slug, category.slug);
  const updatedBy = await getCmsUserId();
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare(`
      UPDATE content SET title = ?, slug = ?, category_id = ?, excerpt = ?, summary = ?,
        description = ?, content = ?, image_url = ?, image_alt_text = ?, image_position = ?, status = ?, seo_title = ?,
        seo_description = ?, seo_keywords = ?, seo_robots = ?, scheduled_publish_at = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        published_at = CASE
          WHEN ? = 'published' THEN COALESCE(published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          ELSE NULL
        END
      WHERE id = ?
    `).run(
      input.title, input.slug, input.categoryId, input.excerpt, input.summary,
      input.description, input.content, input.imageUrl, input.imageAltText, input.imagePosition, input.status, input.seoTitle,
      input.seoDescription, input.seoKeywords, input.seoRobots, input.scheduledPublishAt, input.status, id,
    );
    if (previousPath !== nextPath) {
      database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(nextPath);
      database.prepare(`
        INSERT INTO cms_url_redirects (source_path, content_id) VALUES (?, ?)
        ON CONFLICT(source_path) DO UPDATE SET content_id = excluded.content_id
      `).run(previousPath, id);
    }
    database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
      .run(crypto.randomUUID(), id, JSON.stringify(previous), updatedBy);
    database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
      .run(crypto.randomUUID(), id, JSON.stringify(findContentById(id)), updatedBy);
    database.exec("COMMIT");
    return NextResponse.json({ data: toPublicContent(findContentById(id)!) });
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A content item with that slug already exists." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to delete CMS content." }, { status: 401 });
  }

  const { id } = await params;
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Only administrators can delete content." }, { status: 403 });
  const existing = findContentById(id);
  if (!existing) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  getCmsDatabase().prepare("DELETE FROM content WHERE id = ?").run(id);
  return NextResponse.json({ data: { deleted: true } });
}
