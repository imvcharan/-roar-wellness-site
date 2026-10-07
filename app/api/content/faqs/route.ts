import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  const data = getCmsDatabase().prepare("SELECT question, answer FROM cms_faqs WHERE status = 'published' ORDER BY position, question COLLATE NOCASE").all();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
