import { NextResponse } from "next/server";
import { listContent, toPublicBlogContent } from "@/lib/cms-db";
import { servicePostSlugs } from "@/lib/cms-import-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const archiveOnly = new URL(request.url).searchParams.get("archive") === "true";
  const posts = listContent().filter((item) => archiveOnly
    ? item.category_slug === "blog"
    : item.category_slug === "blog" || servicePostSlugs.has(item.slug)
  );
  return NextResponse.json({ data: posts.map(toPublicBlogContent) }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
