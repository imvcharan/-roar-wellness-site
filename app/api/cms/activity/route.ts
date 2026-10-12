import { NextResponse } from "next/server";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  getCmsDatabase().prepare("DELETE FROM cms_audit_log WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 50);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 50;
  const data = getCmsDatabase().prepare(`
    SELECT id, actor_name, action, resource_type, resource_id, summary, location, created_at
    FROM cms_audit_log ORDER BY created_at DESC LIMIT ?
  `).all(limit);
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
