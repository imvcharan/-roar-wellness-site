import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsUserId, verifyPassword } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import {
  consumeTotpRecoveryCode,
  createTotpRecoveryCodes,
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  hashRecoveryCode,
  matchTotpCounter,
} from "@/lib/cms-totp";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getCmsUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to manage multi-factor authentication." }, { status: 401 });
  const user = getCmsDatabase().prepare("SELECT totp_secret_enc FROM cms_users WHERE id = ?").get(userId) as { totp_secret_enc: string | null } | undefined;
  if (!user) return NextResponse.json({ error: "CMS account not found." }, { status: 404 });
  return NextResponse.json({ data: { enabled: Boolean(user.totp_secret_enc) } });
}

export async function POST(request: Request) {
  const userId = await getCmsUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to manage multi-factor authentication." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json({ error: "Multi-factor authentication request is too large." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Multi-factor authentication data is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Multi-factor authentication data is required." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const database = getCmsDatabase();
  const user = database.prepare("SELECT email, password_hash, totp_secret_enc, totp_pending_secret_enc, totp_pending_at, totp_last_counter FROM cms_users WHERE id = ?")
    .get(userId) as {
      email: string; password_hash: string; totp_secret_enc: string | null;
      totp_pending_secret_enc: string | null; totp_pending_at: string | null; totp_last_counter: number;
    } | undefined;
  if (!user) return NextResponse.json({ error: "CMS account not found." }, { status: 404 });

  if (data.action === "start") {
    if (user.totp_secret_enc) return NextResponse.json({ error: "Authenticator app verification is already enabled." }, { status: 409 });
    const secret = createTotpSecret();
    database.prepare(`
      UPDATE cms_users SET totp_pending_secret_enc = ?, totp_pending_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `).run(encryptTotpSecret(secret), userId);
    const label = `Roar Wellness:${user.email}`;
    const uri = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=Roar%20Wellness&algorithm=SHA1&digits=6&period=30`;
    return NextResponse.json({ data: { secret, uri, expiresInMinutes: 10 } }, { headers: { "Cache-Control": "no-store" } });
  }

  if (data.action === "verify") {
    if (user.totp_secret_enc || !user.totp_pending_secret_enc || !user.totp_pending_at) {
      return NextResponse.json({ error: "Start authenticator setup before verifying its code." }, { status: 409 });
    }
    const pendingAt = Date.parse(user.totp_pending_at);
    if (!Number.isFinite(pendingAt) || Date.now() - pendingAt > 10 * 60 * 1000) {
      database.prepare("UPDATE cms_users SET totp_pending_secret_enc = NULL, totp_pending_at = NULL WHERE id = ?").run(userId);
      return NextResponse.json({ error: "Authenticator setup expired. Start again." }, { status: 409 });
    }
    const secret = decryptTotpSecret(user.totp_pending_secret_enc);
    const counter = matchTotpCounter(secret, data.code);
    if (counter === null) return NextResponse.json({ error: "That authenticator code is incorrect or expired." }, { status: 400 });
    const recoveryCodes = createTotpRecoveryCodes();
    database.exec("BEGIN IMMEDIATE");
    try {
      database.prepare(`
        UPDATE cms_users SET totp_secret_enc = totp_pending_secret_enc,
          totp_pending_secret_enc = NULL, totp_pending_at = NULL, totp_last_counter = ?
        WHERE id = ?
      `).run(Number(counter), userId);
      const addCode = database.prepare("INSERT INTO cms_totp_recovery_codes (code_hash, user_id) VALUES (?, ?)");
      recoveryCodes.forEach((code) => addCode.run(hashRecoveryCode(code), userId));
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    recordCmsAudit(userId, request, "auth.mfa_enable", "account", userId, "Enabled authenticator-app multi-factor authentication.");
    return NextResponse.json({ data: { enabled: true, recoveryCodes } }, { headers: { "Cache-Control": "no-store" } });
  }

  if (data.action === "disable") {
    if (!user.totp_secret_enc) return NextResponse.json({ error: "Authenticator app verification is not enabled." }, { status: 409 });
    if (typeof data.password !== "string" || data.password.length > 1024 || !verifyPassword(data.password, user.password_hash)) {
      return NextResponse.json({ error: "Enter your correct password to disable multi-factor authentication." }, { status: 401 });
    }
    const secret = decryptTotpSecret(user.totp_secret_enc);
    const counter = matchTotpCounter(secret, data.code);
    const validTotp = counter !== null && Number(counter) > user.totp_last_counter;
    const validCode = validTotp || consumeTotpRecoveryCode(userId, data.code);
    if (!validCode) return NextResponse.json({ error: "Enter a valid authenticator or unused recovery code." }, { status: 400 });
    database.prepare(`
      UPDATE cms_users SET totp_secret_enc = NULL, totp_pending_secret_enc = NULL,
        totp_pending_at = NULL, totp_last_counter = -1 WHERE id = ?
    `).run(userId);
    if (validTotp && counter !== null) {
      database.prepare("UPDATE cms_users SET totp_last_counter = ? WHERE id = ?").run(Number(counter), userId);
    }
    database.prepare("DELETE FROM cms_totp_recovery_codes WHERE user_id = ?").run(userId);
    recordCmsAudit(userId, request, "auth.mfa_disable", "account", userId, "Disabled authenticator-app multi-factor authentication.");
    return NextResponse.json({ data: { enabled: false } });
  }

  return NextResponse.json({ error: "Choose a valid multi-factor authentication action." }, { status: 400 });
}
