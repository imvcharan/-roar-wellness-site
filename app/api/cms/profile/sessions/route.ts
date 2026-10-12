import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsSessionId, getCmsUserId } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCmsUserId();
  const currentSessionId = await getCmsSessionId();
  if (!userId || !currentSessionId) return NextResponse.json({ error: "Sign in to view your sessions." }, { status: 401 });
  const data = getCmsDatabase().prepare(`
    SELECT session_id, created_at, expires_at FROM cms_sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(userId, Math.floor(Date.now() / 1000)) as { session_id: string; created_at: string; expires_at: number }[];
  return NextResponse.json({
    data: data.map((session) => ({ ...session, is_current: session.session_id === currentSessionId })),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function DELETE(request: Request) {
  const userId = await getCmsUserId();
  const currentSessionId = await getCmsSessionId();
  if (!userId || !currentSessionId) return NextResponse.json({ error: "Sign in to manage your sessions." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a session to sign out." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Choose a session to sign out." }, { status: 400 });
  }
  const sessionId = (body as Record<string, unknown>).sessionId;
  if (typeof sessionId !== "string" || !sessionId || sessionId === currentSessionId) {
    return NextResponse.json({ error: "You cannot revoke the session you are currently using." }, { status: 400 });
  }
  const result = getCmsDatabase().prepare("DELETE FROM cms_sessions WHERE session_id = ? AND user_id = ?").run(sessionId, userId);
  if (!result.changes) return NextResponse.json({ error: "That active session was not found." }, { status: 404 });
  recordCmsAudit(userId, request, "auth.session_revoke", "session", sessionId, "Signed out another active CMS session.");
  return NextResponse.json({ data: { revoked: true } });
}
