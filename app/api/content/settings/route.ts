import { NextResponse } from "next/server";
import { getCmsSettings } from "@/lib/cms-db";
import { getPublicCmsSettings } from "@/lib/cms-settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ data: getPublicCmsSettings(await getCmsSettings()) }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
