import { NextResponse } from "next/server";
import { listContent, toPublicContent } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: listContent({ categorySlug: "blog" }).map(toPublicContent) }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
