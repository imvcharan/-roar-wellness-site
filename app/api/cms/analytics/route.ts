import { NextResponse } from "next/server";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

interface Totals {
  page_views: number | null;
  appointment_requests: number | null;
}

function utcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function periodTotals(start: string, end: string): Totals {
  const result = getCmsDatabase().prepare(`
    SELECT
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_type = 'appointment_submit' THEN 1 ELSE 0 END) AS appointment_requests
    FROM cms_analytics_events
    WHERE created_at >= ? AND created_at < ?
  `).get(start, end);
  return {
    page_views: typeof result?.page_views === "number" ? result.page_views : null,
    appointment_requests: typeof result?.appointment_requests === "number" ? result.appointment_requests : null,
  };
}

function conversionRate(totals: Totals): number | null {
  const views = totals.page_views ?? 0;
  return views ? Number((((totals.appointment_requests ?? 0) / views) * 100).toFixed(2)) : null;
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export async function GET(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  const previousStartDate = new Date(startDate);
  previousStartDate.setUTCDate(previousStartDate.getUTCDate() - days);
  const start = `${utcDate(startDate)}T00:00:00.000Z`;
  const end = `${utcDate(endDate)}T00:00:00.000Z`;
  const previousStart = `${utcDate(previousStartDate)}T00:00:00.000Z`;
  const previous = periodTotals(previousStart, start);
  const totals = periodTotals(start, end);
  const database = getCmsDatabase();
  const popularPages = database.prepare(`
    SELECT page_path, COUNT(*) AS views
    FROM cms_analytics_events
    WHERE event_type = 'page_view' AND created_at >= ? AND created_at < ?
    GROUP BY page_path ORDER BY views DESC, page_path LIMIT 10
  `).all(start, end);
  const recordedDays = database.prepare(`
    SELECT substr(created_at, 1, 10) AS day,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) AS page_views,
      SUM(CASE WHEN event_type = 'appointment_submit' THEN 1 ELSE 0 END) AS appointment_requests
    FROM cms_analytics_events
    WHERE created_at >= ? AND created_at < ?
    GROUP BY substr(created_at, 1, 10) ORDER BY day
  `).all(start, end) as { day: string; page_views: number; appointment_requests: number }[];
  const dayLookup = new Map(recordedDays.map((day) => [day.day, day]));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + index);
    const day = utcDate(date);
    return dayLookup.get(day) ?? { day, page_views: 0, appointment_requests: 0 };
  });
  const currentViews = totals.page_views ?? 0;
  const currentRequests = totals.appointment_requests ?? 0;
  const previousViews = previous.page_views ?? 0;
  const previousRequests = previous.appointment_requests ?? 0;
  return NextResponse.json({
    data: {
      totals: { page_views: currentViews, appointment_requests: currentRequests, conversion_rate: conversionRate(totals) },
      previous: { page_views: previousViews, appointment_requests: previousRequests, conversion_rate: conversionRate(previous) },
      change: {
        page_views: percentChange(currentViews, previousViews),
        appointment_requests: percentChange(currentRequests, previousRequests),
      },
      popularPages,
      days: daily,
      rangeDays: days,
      retention: "12 months",
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
