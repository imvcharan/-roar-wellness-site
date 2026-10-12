import { NextResponse } from "next/server";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const database = getCmsDatabase();
  const totals = database.prepare(`
    SELECT
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_type = 'appointment_submit' THEN 1 ELSE 0 END) AS appointment_requests
    FROM cms_analytics_events
    WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
  `).get();
  const popularPages = database.prepare(`
    SELECT page_path, COUNT(*) AS views
    FROM cms_analytics_events
    WHERE event_type = 'page_view'
      AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
    GROUP BY page_path ORDER BY views DESC, page_path LIMIT 10
  `).all();
  const days = database.prepare(`
    SELECT substr(created_at, 1, 10) AS day,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_type = 'appointment_submit' THEN 1 ELSE 0 END) AS appointment_requests
    FROM cms_analytics_events
    WHERE created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
    GROUP BY substr(created_at, 1, 10) ORDER BY day
  `).all();
  return NextResponse.json({ data: { totals, popularPages, days, retention: "12 months" } }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
