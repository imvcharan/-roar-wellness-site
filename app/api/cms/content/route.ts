import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { canEditCms, getCmsRole, getCmsUserId } from "@/lib/cms-auth";
import { insertCmsContent } from "@/lib/cms-content-create";
import {
  findCategory,
  getCmsDatabase,
  isCmsUniqueViolation,
  listContent,
  toPublicContent,
  withCmsTransaction,
} from "@/lib/cms-db";
import { getCmsContentHref, isPageCategory, isServiceCategory } from "@/lib/cms-routes";
import { CmsContentValidationError, isReservedCmsRootSlug, parseCmsContentInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeUnpublished = url.searchParams.get("all") === "1";
  if (includeUnpublished && !await getCmsRole()) {
    return NextResponse.json({ error: "Sign in to view draft and archived content." }, { status: 401 });
  }
  const categoryId = url.searchParams.get("categoryId") || undefined;
  const categorySlug = url.searchParams.get("category") || undefined;
  const content = await listContent({ includeUnpublished, categoryId, categorySlug });
  return NextResponse.json({
    data: content.map(toPublicContent),
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
  const id = crypto.randomUUID();
  const createdBy = await getCmsUserId();
  try {
    const item = await withCmsTransaction(async () => {
      await insertCmsContent(database, id, input);
      await database.prepare("DELETE FROM cms_url_redirects WHERE source_path = ?").run(getCmsContentHref(input.slug, category.slug));
      const entries = await listContent({ includeUnpublished: true });
      const created = entries.find((entry) => entry.id === id);
      await database.prepare("INSERT INTO cms_revisions (id, content_id, snapshot, created_by) VALUES (?, ?, ?, ?)")
        .run(crypto.randomUUID(), id, JSON.stringify(created), createdBy);
      return created;
    });
    await recordCmsAudit(createdBy, request, "content.create", "content", id, `Created content “${input.title}” as ${input.status}.`);
    return NextResponse.json({ data: item && toPublicContent(item) }, { status: 201 });
  } catch (error) {
    if (isCmsUniqueViolation(error)) {
      return NextResponse.json({ error: "A content item with that slug already exists.", field: "slug" }, { status: 409 });
    }
    throw error;
  }
}
