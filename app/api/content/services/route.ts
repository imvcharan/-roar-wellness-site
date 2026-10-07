import { NextResponse } from "next/server";
import { listContent, toPublicContent } from "@/lib/cms-db";
import { isServiceCategory } from "@/lib/cms-routes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const includeAllServices = new URL(request.url).searchParams.get("all") === "1";
  const content = includeAllServices
    ? ["treatments", "therapy", "mental-healthcare"]
      .flatMap((categorySlug) => listContent({ categorySlug }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    : listContent({ categorySlug: "treatments" });
  return NextResponse.json({
    data: content.filter((item) => isServiceCategory(item.category_slug)).map(toPublicContent),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
