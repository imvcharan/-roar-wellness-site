import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { canEditCms, getCmsUserId } from "@/lib/cms-auth";
import { getCmsDatabase, isCmsUniqueViolation, listCategories } from "@/lib/cms-db";
import { parseCategoryInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: await listCategories() }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function POST(request: Request) {
  if (!await canEditCms()) {
    return NextResponse.json({ error: "Sign in to manage CMS categories." }, { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  let category: ReturnType<typeof parseCategoryInput>;
  try {
    category = parseCategoryInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid category." }, { status: 400 });
  }

  try {
    const id = crypto.randomUUID();
    await getCmsDatabase()
      .prepare("INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)")
      .run(id, category.name, category.slug);
    await recordCmsAudit(await getCmsUserId(), request, "category.create", "category", id, `Created category “${category.name}”.`);
    const categories = await listCategories();
    return NextResponse.json({ data: categories.find((item) => item.id === id) }, { status: 201 });
  } catch (error) {
    if (isCmsUniqueViolation(error)) {
      return NextResponse.json({ error: "A category with that name or slug already exists." }, { status: 409 });
    }
    throw error;
  }
}
