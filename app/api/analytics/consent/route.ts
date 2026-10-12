import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Same-origin requests only." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a valid analytics privacy option." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Choose a valid analytics privacy option." }, { status: 400 });
  }
  const consent = (body as Record<string, unknown>).consent;
  if (consent !== "accepted" && consent !== "declined") {
    return NextResponse.json({ error: "Choose a valid analytics privacy option." }, { status: 400 });
  }
  const response = NextResponse.json({ data: { saved: true } }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("roar_analytics_consent", consent === "accepted" ? "1" : "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: consent === "accepted" ? 60 * 60 * 24 * 180 : 0,
  });
  return response;
}
