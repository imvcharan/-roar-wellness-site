import { randomBytes, scryptSync } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsSessionId, getCmsUserId, verifyPassword } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getCmsUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Password change data is required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.currentPassword !== "string" || typeof data.newPassword !== "string"
    || data.newPassword.length < 12 || data.newPassword.length > 1024) {
    return NextResponse.json({ error: "Enter your current password and a new password of at least 12 characters." }, { status: 400 });
  }
  const database = getCmsDatabase();
  const user = database.prepare("SELECT password_hash FROM cms_users WHERE id = ?").get(userId) as { password_hash: string } | undefined;
  if (!user || !verifyPassword(data.currentPassword, user.password_hash)) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(data.newPassword, salt, 64).toString("hex");
  database.prepare("UPDATE cms_users SET password_hash = ? WHERE id = ?").run(`${salt}:${hash}`, userId);
  const sessionId = await getCmsSessionId();
  database.prepare("DELETE FROM cms_sessions WHERE user_id = ? AND session_id != ?").run(userId, sessionId);
  return NextResponse.json({ data: { updated: true } });
}
