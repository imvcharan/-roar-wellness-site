import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { isCmsMediaStorageAvailable } from "@/lib/cms-media-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let databaseAvailable = true;
  try {
    getCmsDatabase().prepare("SELECT 1").get();
  } catch (error) {
    console.error("Application health check could not access the CMS database.", error);
    databaseAvailable = false;
  }
  const mediaAvailable = await isCmsMediaStorageAvailable();
  if (!mediaAvailable) console.error("Application health check could not access the CMS media directory.");
  const available = databaseAvailable && mediaAvailable;
  return NextResponse.json({
    status: available ? "ok" : "unavailable",
    checks: {
      database: databaseAvailable ? "ok" : "unavailable",
      media: mediaAvailable ? "ok" : "unavailable",
    },
  }, {
    status: available ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
