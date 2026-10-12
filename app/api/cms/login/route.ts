import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import {
  cmsAuthConfigured,
  cmsSessionCookieName,
  createCmsSession,
  verifyPassword,
} from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { consumeTotpRecoveryCode, decryptTotpSecret, matchTotpCounter } from "@/lib/cms-totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!cmsAuthConfigured()) {
    return NextResponse.json(
      { error: "CMS_ADMIN_PASSWORD and CMS_SESSION_SECRET must be configured." },
      { status: 503 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A password is required." }, { status: 400 });
  }
  const { email, password, challengeToken, totpCode } = body as Record<string, unknown>;
  if (typeof password !== "string" || password.length > 1024) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = getCmsDatabase()
    .prepare("SELECT id, email, name, role, password_hash, totp_secret_enc, totp_last_counter FROM cms_users WHERE email = ? COLLATE NOCASE")
    .get(typeof email === "string" ? email.trim() : "") as {
      id: string; email: string; name: string; role: string; password_hash: string;
      totp_secret_enc: string | null; totp_last_counter: number;
    } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const database = getCmsDatabase();
  if (user.totp_secret_enc) {
    if (typeof challengeToken !== "string") {
      const challenge = randomBytes(32).toString("base64url");
      database.prepare("DELETE FROM cms_login_challenges WHERE expires_at <= ?").run(Math.floor(Date.now() / 1000));
      database.prepare("DELETE FROM cms_login_challenges WHERE user_id = ?").run(user.id);
      database.prepare("INSERT INTO cms_login_challenges (challenge_hash, user_id, expires_at) VALUES (?, ?, ?)")
        .run(createHash("sha256").update(challenge).digest("hex"), user.id, Math.floor(Date.now() / 1000) + 5 * 60);
      return NextResponse.json({ data: { requiresMfa: true, challengeToken: challenge } }, { headers: { "Cache-Control": "no-store" } });
    }
    const challengeRow = database.prepare(`
      DELETE FROM cms_login_challenges WHERE challenge_hash = ? AND user_id = ?
      RETURNING expires_at
    `).get(createHash("sha256").update(challengeToken).digest("hex"), user.id) as { expires_at: number } | undefined;
    if (!challengeRow || challengeRow.expires_at <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "The sign-in verification expired. Enter your password again." }, { status: 401 });
    }
    const secret = decryptTotpSecret(user.totp_secret_enc);
    const counter = matchTotpCounter(secret, totpCode);
    const validTotp = counter !== null && Number(counter) > user.totp_last_counter;
    if (!validTotp && !consumeTotpRecoveryCode(user.id, totpCode)) {
      return NextResponse.json({ error: "The authenticator or recovery code is invalid or already used." }, { status: 401 });
    }
    if (validTotp) database.prepare("UPDATE cms_users SET totp_last_counter = ? WHERE id = ?").run(Number(counter), user.id);
  } else if (challengeToken !== undefined || totpCode !== undefined) {
    return NextResponse.json({ error: "Multi-factor verification is not enabled for this account." }, { status: 400 });
  }

  const session = createCmsSession(user.id);
  recordCmsAudit(user.id, request, "auth.login", "session", null, "Signed in to the CMS.");
  const response = NextResponse.json({ data: { requiresMfa: false, user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  response.cookies.set(cmsSessionCookieName(), session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
