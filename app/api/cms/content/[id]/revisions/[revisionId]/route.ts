import { NextResponse } from "next/server";
import { canEditCms } from "@/lib/cms-auth";
import { findCategory, findContentById, getCmsDatabase, recordContentRevision } from "@/lib/cms-db";
import { getCmsContentHref, isPageCategory } from "@/lib/cms-routes";
import { isReservedCmsPageSlug } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; revisionId: string }> },
) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required to restore revisions." }, { status: 403 });
  const { id, revisionId } = await params;
  const database = getCmsDatabase();
  const revision = database.prepare("SELECT snapshot FROM cms_revisions WHERE id = ? AND content_id = ?")
    .get(revisionId, id) as { snapshot: string } | undefined;
  const previous = findContentById(id);
  if (!revision || !previous) return NextResponse.json({ error: "Content revision was not found." }, { status: 404 });
  let snapshot: Record<string, unknown>;
  try {
    snapshot = JSON.parse(revision.snapshot) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "This revision cannot be restored because its snapshot is invalid." }, { status: 409 });
  }
  const category = typeof snapshot.category_id === "string" ? findCategory(snapshot.category_id) : undefined;
  const status = snapshot.status === "draft" || snapshot.status === "published" || snapshot.status === "archived"
    ? snapshot.status
    : null;
  if (typeof snapshot.title !== "string" || typeof snapshot.slug !== "string"
    || !category || !status) {
    return NextResponse.json({ error: "This revision references a missing category and cannot be restored." }, { status: 409 });
  }
  if (isPageCategory(category.slug) && isReservedCmsPageSlug(snapshot.slug)) {
    return NextResponse.json({ error: "This revision uses a slug reserved for a built-in website route." }, { status: 409 });
  }
  const text = (value: unknown): string | null => typeof value === "string" ? value : null;
  const previousPath = getCmsContentHref(previous.slug, previous.category_slug);
  const restoredPath = getCmsContentHref(snapshot.slug, category.slug);
  try {
    database.exec("BEGIN IMMEDIATE");
    recordContentRevision(id, null);
    database.prepare(`
      UPDATE content SET title = ?, slug = ?, category_id = ?, excerpt = ?, summary = ?,
        description = ?, content = ?, image_url = ?, image_alt_text = ?, image_position = ?, status = ?, seo_title = ?,
        seo_description = ?, seo_keywords = ?, seo_robots = ?, scheduled_publish_at = ?, published_at = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `).run(
      snapshot.title, snapshot.slug, category.id, text(snapshot.excerpt),
      text(snapshot.summary), text(snapshot.description), text(snapshot.content),
      text(snapshot.image_url), text(snapshot.image_alt_text), text(snapshot.image_position) ?? "50% 50%", status, text(snapshot.seo_title),
      text(snapshot.seo_description), text(snapshot.seo_keywords), text(snapshot.seo_robots), text(snapshot.scheduled_publish_at),
      text(snapshot.published_at), id,
    );
    if (previousPath !== restoredPath) {
      database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(restoredPath);
      database.prepare(`
        INSERT INTO cms_url_redirects (source_path, content_id) VALUES (?, ?)
        ON CONFLICT(source_path) DO UPDATE SET content_id = excluded.content_id
      `).run(previousPath, id);
    } else {
      database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(restoredPath);
    }
    recordContentRevision(id, null);
    database.exec("COMMIT");
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "The revision slug is now used by another page. Resolve the duplicate before restoring." }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ data: findContentById(id) });
}
