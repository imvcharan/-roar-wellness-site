import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { canEditCms, getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { findCategory, getCmsDatabase, isCmsForeignKeyViolation, isCmsUniqueViolation } from "@/lib/cms-db";
import { parseCategoryInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const { id } = await params;
  const existing = await findCategory(id);
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  if (existing.is_default) return NextResponse.json({ error: "The built-in category names and slugs cannot be changed." }, { status: 409 });
  const body: unknown = await request.json().catch(() => null);
  let input: ReturnType<typeof parseCategoryInput>;
  try {
    input = parseCategoryInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid category." }, { status: 400 });
  }
  try {
    await getCmsDatabase().prepare("UPDATE categories SET name = ?, slug = ? WHERE id = ?").run(input.name, input.slug, id);
    await recordCmsAudit(await getCmsUserId(), request, "category.update", "category", id, `Updated category “${input.name}”.`);
    return NextResponse.json({ data: await findCategory(id) });
  } catch (error) {
    if (isCmsUniqueViolation(error)) {
      return NextResponse.json({ error: "A category with that name or slug already exists." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to manage CMS categories." }, { status: 401 });
  }
  const { id } = await params;
  if (!await isCmsAdmin()) {
    return NextResponse.json({ error: "Only administrators can delete categories." }, { status: 403 });
  }
  const category = await findCategory(id);
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  if (category.is_default) {
    return NextResponse.json({ error: "The built-in categories cannot be deleted." }, { status: 409 });
  }
  try {
    await getCmsDatabase().prepare("DELETE FROM categories WHERE id = ?").run(id);
    await recordCmsAudit(await getCmsUserId(), request, "category.delete", "category", id, `Deleted category “${category.name}”.`);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (isCmsForeignKeyViolation(error)) {
      return NextResponse.json({ error: "Move or delete this category's content before deleting the category." }, { status: 409 });
    }
    throw error;
  }
}
