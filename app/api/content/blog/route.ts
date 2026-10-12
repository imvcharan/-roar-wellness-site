import { NextResponse } from "next/server";
import { listContent, toPublicBlogContent } from "@/lib/cms-db";
import { servicePostSlugs } from "@/lib/cms-import-utils";

export const runtime = "nodejs";

export async function GET() {
  const posts = listContent().filter((item) =>
    item.category_slug === "blog" || servicePostSlugs.has(item.slug)
  );
  return NextResponse.json({ data: posts.map(toPublicBlogContent) }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
