import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

function isSameOriginRequest(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Same-origin requests only." }, { status: 403 });
  const hasConsent = request.headers.get("cookie")?.split(";")
    .some((part) => part.trim() === "roar_analytics_consent=1");
  if (!hasConsent) return NextResponse.json({ error: "Analytics consent is required." }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Analytics event is invalid." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Analytics event is invalid." }, { status: 400 });
  }
  const { eventType, pagePath } = body as Record<string, unknown>;
  if ((eventType !== "page_view" && eventType !== "appointment_submit")
    || typeof pagePath !== "string"
    || pagePath.length > 200
    || !pagePath.startsWith("/")
    || pagePath.startsWith("//")
    || pagePath.startsWith("/admin")
    || pagePath.includes("?")
    || pagePath.includes("#")
    || /[\r\n]/.test(pagePath)) {
    return NextResponse.json({ error: "Analytics event is invalid." }, { status: 400 });
  }
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_analytics_events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  database.prepare("INSERT INTO cms_analytics_events (id, event_type, page_path) VALUES (?, ?, ?)")
    .run(randomUUID(), eventType, pagePath);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
