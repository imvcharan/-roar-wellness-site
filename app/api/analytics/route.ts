import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsClientIp } from "@/lib/cms-client-ip";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";

export const runtime = "nodejs";

function isSameOriginRequest(request: Request): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Same-origin requests only." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json({ error: "Analytics event is too large." }, { status: 413 });
  }
  const hasConsent = request.headers.get("cookie")?.split(";")
    .some((part) => part.trim() === "roar_analytics_consent=1");
  if (!hasConsent) return NextResponse.json({ error: "Analytics consent is required." }, { status: 403 });
  const clientIp = getCmsClientIp(request);
  if (clientIp) {
    const rateLimit = await consumeCmsRateLimit("analytics-events", clientIp, 120, 60 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many analytics events were submitted." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }
  }
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
  await database.prepare("INSERT INTO cms_analytics_events (id, event_type, page_path) VALUES (?, ?, ?)")
    .run(randomUUID(), eventType, pagePath);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
