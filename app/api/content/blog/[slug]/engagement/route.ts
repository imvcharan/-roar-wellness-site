import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase, findContentBySlug, listContent } from "@/lib/cms-db";
import { getCmsClientIp } from "@/lib/cms-client-ip";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";
import {
  getPostEngagement,
  recordPostEngagement,
  type PostEngagementEvent,
} from "@/lib/cms-engagement";

export const runtime = "nodejs";

const visitorCookieName = "roar_blog_visitor";
const visitorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getVisitorId(request: Request): string | null {
  const cookie = request.headers.get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${visitorCookieName}=`));
  const value = cookie?.slice(visitorCookieName.length + 1);
  return value && visitorIdPattern.test(value) ? value : null;
}

function isPostEngagementEvent(value: unknown): value is PostEngagementEvent {
  return value === "view" || value === "like" || value === "share";
}

async function findPublishedBlogPost(slug: string) {
  await listContent();
  const item = await findContentBySlug(slug);
  return item?.category_slug === "blog" ? item : undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = await findPublishedBlogPost(slug);
  if (!item) {
    return NextResponse.json({ error: "Published article was not found." }, { status: 404 });
  }

  const data = await getPostEngagement(getCmsDatabase(), item.id, getVisitorId(request));
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This action must come from the same website." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json({ error: "Engagement action is too large." }, { status: 413 });
  }
  const clientIp = getCmsClientIp(request);
  if (clientIp) {
    const rateLimit = await consumeCmsRateLimit("blog-engagement", clientIp, 30, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many article actions were submitted. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds), "Cache-Control": "no-store" } },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid engagement action is required." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("event" in body) || !isPostEngagementEvent(body.event)) {
    return NextResponse.json({ error: "Choose a valid engagement action." }, { status: 400 });
  }

  const { slug } = await params;
  const item = await findPublishedBlogPost(slug);
  if (!item) {
    return NextResponse.json({ error: "Published article was not found." }, { status: 404 });
  }

  const existingVisitorId = getVisitorId(request);
  const generatedVisitorId = body.event === "like" && !existingVisitorId ? randomUUID() : null;
  const visitorId = existingVisitorId || generatedVisitorId;
  const data = await recordPostEngagement(getCmsDatabase(), item.id, body.event, visitorId);
  const response = NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  if (generatedVisitorId) {
    response.cookies.set(visitorCookieName, generatedVisitorId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
