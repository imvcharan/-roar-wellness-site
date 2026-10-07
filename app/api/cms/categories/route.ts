import { NextResponse } from "next/server";
import { canEditCms } from "@/lib/cms-auth";
import { getCmsDatabase, listCategories } from "@/lib/cms-db";
import { parseCategoryInput } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: listCategories() }, {
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
    getCmsDatabase()
      .prepare("INSERT INTO categories (id, name, slug) VALUES (?, ?, ?)")
      .run(id, category.name, category.slug);
    return NextResponse.json({ data: listCategories().find((item) => item.id === id) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "A category with that name or slug already exists." }, { status: 409 });
    }
    throw error;
  }
}
