import { NextResponse } from "next/server";
import { getCmsRole } from "@/lib/cms-auth";
import { findContentBySlug, listContent, toPublicContent } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await getCmsRole()) return NextResponse.json({ error: "Sign in to preview unpublished content." }, { status: 401 });
  const { slug } = await params;
  listContent();
  const item = findContentBySlug(slug, true);
  return item
    ? NextResponse.json({ data: toPublicContent(item) }, { headers: { "Cache-Control": "no-store, max-age=0" } })
    : NextResponse.json({ error: "Content preview was not found." }, { status: 404 });
}
