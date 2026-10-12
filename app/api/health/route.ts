import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    getCmsDatabase().prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Application health check could not access the CMS database.", error);
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
