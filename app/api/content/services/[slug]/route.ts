import { NextResponse } from "next/server";
import { findContentBySlug, listContent, toPublicContent } from "@/lib/cms-db";
import { isServiceCategory } from "@/lib/cms-routes";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  listContent();
  const item = findContentBySlug(slug);
  return item && isServiceCategory(item.category_slug)
    ? NextResponse.json({ data: toPublicContent(item) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
    : NextResponse.json({ error: "Published service was not found." }, { status: 404 });
}
