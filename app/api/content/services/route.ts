import { NextResponse } from "next/server";
import { listContent, toPublicContent } from "@/lib/cms-db";
import { isLocationService, isServiceCategory } from "@/lib/cms-routes";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const includeAllServices = searchParams.get("all") === "1";
  const includeArchiveServices = searchParams.get("archive") === "1";
  const excludeLocationServices = !includeAllServices || includeArchiveServices;
  const content = includeAllServices || includeArchiveServices
    ? (await Promise.all(["treatments", "therapy", "mental-healthcare"]
      .map((categorySlug) => listContent({ categorySlug }))))
      .flat()
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    : await listContent({ categorySlug: "treatments" });
  return NextResponse.json({
    data: content
      .filter((item) => isServiceCategory(item.category_slug)
        && (!excludeLocationServices || !isLocationService(item.slug)))
      .map(toPublicContent),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
