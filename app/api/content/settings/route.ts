import { NextResponse } from "next/server";
import { getCmsSettings } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: getCmsSettings() }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
