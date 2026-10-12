import { NextResponse } from "next/server";
import { findContentBySlug, listContent, toPublicBlogContent } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  listContent();
  const item = findContentBySlug(slug);
  return item?.category_slug === "blog"
    ? NextResponse.json({ data: toPublicBlogContent(item) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
    : NextResponse.json({ error: "Published article was not found." }, { status: 404 });
}
