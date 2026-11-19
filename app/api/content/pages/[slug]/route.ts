import { NextResponse } from "next/server";
import { findContentBySlug, listContent, toPublicContent } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  await listContent();
  const item = await findContentBySlug(slug);
  return item && item.category_slug === "main-pages"
    ? NextResponse.json({ data: toPublicContent(item) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
    : NextResponse.json({ error: "Published site page was not found." }, { status: 404 });
}
