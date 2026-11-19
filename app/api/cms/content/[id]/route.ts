import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { canEditCms, getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import {
  findCategory,
  findContentById,
  getCmsDatabase,
  isCmsUniqueViolation,
  toPublicContent,
  withCmsTransaction,
} from "@/lib/cms-db";
import { getCmsContentHref, isPageCategory, isServiceCategory } from "@/lib/cms-routes";
import { CmsContentValidationError, isReservedCmsRootSlug, parseCmsContentInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to update CMS content." }, { status: 401 });
  }
  const { id } = await params;
  const previous = await findContentById(id);
  if (!previous) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  let input: ReturnType<typeof parseCmsContentInput>;
  try {
    input = parseCmsContentInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid content.";
    const field = error instanceof CmsContentValidationError ? error.field : undefined;
    return NextResponse.json({ error: message, ...(field ? { field } : {}) }, { status: 400 });
  }
  const category = await findCategory(input.categoryId);
  if (!category) {
    return NextResponse.json({ error: "The selected category does not exist.", field: "categoryId" }, { status: 400 });
  }
  if ((isPageCategory(category.slug) || isServiceCategory(category.slug)) && isReservedCmsRootSlug(input.slug)) {
    return NextResponse.json({ error: "This slug is reserved for a built-in website route. Choose another slug.", field: "slug" }, { status: 400 });
  }

  const database = getCmsDatabase();
  const previousPath = getCmsContentHref(previous.slug, previous.category_slug);
  const nextPath = getCmsContentHref(input.slug, category.slug);
  const updatedBy = await getCmsUserId();
  const previousSnapshot = JSON.stringify(previous);
  let updatedItem: NonNullable<Awaited<ReturnType<typeof findContentById>>>;
  try {
    updatedItem = await withCmsTransaction(async () => {
      const hasPreviousSnapshot = await database.prepare(
        "SELECT 1 FROM cms_revisions WHERE content_id = ? AND snapshot = ? LIMIT 1",
      ).get(id, previousSnapshot);
      await database.prepare(`
      UPDATE content SET title = ?, slug = ?, category_id = ?, excerpt = ?, summary = ?,
        description = ?, content = ?, image_url = ?, image_alt_text = ?, image_position = ?, status = ?, seo_title = ?,
        seo_description = ?, seo_keywords = ?, seo_robots = ?, seo_canonical_url = ?,
        seo_og_title = ?, seo_og_description = ?, seo_og_image = ?,
        seo_twitter_title = ?, seo_twitter_description = ?, seo_twitter_image = ?, scheduled_publish_at = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        published_at = CASE
          WHEN ? = 'published' THEN COALESCE(published_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
          ELSE NULL
        END
      WHERE id = ?
      `).run(
      input.title, input.slug, input.categoryId, input.excerpt, input.summary,
      input.description, input.content, input.imageUrl, input.imageAltText, input.imagePosition, input.status, input.seoTitle,
      input.seoDescription, input.seoKeywords, input.seoRobots, input.seoCanonicalUrl,
      input.seoOgTitle, input.seoOgDescription, input.seoOgImage,
      input.seoTwitterTitle, input.seoTwitterDescription, input.seoTwitterImage,
      input.scheduledPublishAt, input.status, id,
      );
      if (previousPath !== nextPath) {
        await database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(nextPath);
        await database.prepare(`
        INSERT INTO cms_url_redirects (source_path, content_id) VALUES (?, ?)
        ON CONFLICT(source_path) DO UPDATE SET content_id = excluded.content_id
        `).run(previousPath, id);
      }
      if (!hasPreviousSnapshot) {
        await database.prepare(`
        INSERT INTO cms_revisions (id, content_id, snapshot, created_by, created_at)
        VALUES (?, ?, ?, NULL, ?)
        `).run(crypto.randomUUID(), id, previousSnapshot, previous.updated_at);
      }
      const updated = await findContentById(id);
      if (!updated) throw new Error("Updated CMS content could not be loaded.");
      await database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
        .run(crypto.randomUUID(), id, JSON.stringify(updated), updatedBy);
      return updated;
    });
  } catch (error) {
    if (isCmsUniqueViolation(error)) {
      return NextResponse.json({ error: "A content item with that slug already exists.", field: "slug" }, { status: 409 });
    }
    throw error;
  }
  await recordCmsAudit(updatedBy, request, "content.update", "content", id, `Updated content “${input.title}” (${previous.status} → ${input.status}).`);
  return NextResponse.json({ data: toPublicContent(updatedItem) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to delete CMS content." }, { status: 401 });
  }

  const { id } = await params;
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Only administrators can delete content." }, { status: 403 });
  const existing = await findContentById(id);
  if (!existing) return NextResponse.json({ error: "Content not found." }, { status: 404 });
  await getCmsDatabase().prepare("DELETE FROM content WHERE id = ?").run(id);
  await recordCmsAudit(await getCmsUserId(), request, "content.delete", "content", id, `Deleted content “${existing.title}”.`);
  return NextResponse.json({ data: { deleted: true } });
}
