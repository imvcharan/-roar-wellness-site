import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCmsDatabase } from "@/lib/cms-db";

const sessionCookieName = "roar_cms_session";
const sessionLifetimeSeconds = 60 * 60 * 8;

export type CmsRole = "admin" | "editor" | "viewer";

function getSessionSecret(): string | undefined {
  return process.env.CMS_SESSION_SECRET?.trim();
}

export function cmsAuthConfigured(): boolean {
  if (!getSessionSecret()) return false;
  const users = getCmsDatabase().prepare("SELECT COUNT(*) AS count FROM cms_users").get() as { count: number };
  return users.count > 0;
}

function signature(sessionId: string, expiresAt: string, secret: string): string {
  return createHmac("sha256", secret).update(`${sessionId}.${expiresAt}`).digest("base64url");
}

export function verifyCmsSession(token: string | undefined): boolean {
  const secret = getSessionSecret();
  if (!secret || !token) return false;
  const [sessionId, expiresAt, suppliedSignature, extra] = token.split(".");
  if (!sessionId || !expiresAt || !suppliedSignature || extra || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(signature(sessionId, expiresAt, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  const session = getCmsDatabase()
    .prepare("SELECT expires_at FROM cms_sessions WHERE session_id = ?")
    .get(sessionId) as { expires_at: number } | undefined;
  return session?.expires_at === Number(expiresAt);
}

export async function getCmsRole(): Promise<CmsRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!verifyCmsSession(token)) return null;
  const sessionId = token!.split(".")[0];
  const row = getCmsDatabase()
    .prepare("SELECT u.role FROM cms_sessions s JOIN cms_users u ON u.id = s.user_id WHERE s.session_id = ?")
    .get(sessionId) as { role: CmsRole } | undefined;
  return row?.role ?? null;
}

export async function isCmsAdmin(): Promise<boolean> {
  return (await getCmsRole()) === "admin";
}

export async function canEditCms(): Promise<boolean> {
  const role = await getCmsRole();
  return role === "admin" || role === "editor";
}

export async function getCmsUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!verifyCmsSession(token)) return null;
  const sessionId = token!.split(".")[0];
  const session = getCmsDatabase()
    .prepare("SELECT user_id FROM cms_sessions WHERE session_id = ?")
    .get(sessionId) as { user_id: string | null } | undefined;
  return session?.user_id ?? null;
}

export async function getCmsSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!verifyCmsSession(token)) return null;
  return token!.split(".")[0];
}

export function createCmsSession(userId: string): { token: string; maxAge: number } {
  const secret = getSessionSecret();
  if (!secret) throw new Error("CMS_SESSION_SECRET is not configured.");
  const maxAge = sessionLifetimeSeconds;
  const expiresAt = String(Math.floor(Date.now() / 1000) + maxAge);
  const sessionId = randomUUID();
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_sessions WHERE expires_at <= ?").run(Math.floor(Date.now() / 1000));
  database.prepare("INSERT INTO cms_sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionId, userId, Number(expiresAt));
  return { token: `${sessionId}.${expiresAt}.${signature(sessionId, expiresAt, secret)}`, maxAge };
}

export function cmsSessionCookieName(): string {
  return sessionCookieName;
}

export async function revokeCmsSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const sessionId = token?.split(".")[0];
  if (sessionId) {
    getCmsDatabase().prepare("DELETE FROM cms_sessions WHERE session_id = ?").run(sessionId);
  }
}

export function safePasswordEquals(supplied: string, expected: string): boolean {
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length
    && timingSafeEqual(suppliedBytes, expectedBytes);
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const separator = encodedHash.indexOf(":");
  if (separator === -1) return false;
  const salt = encodedHash.slice(0, separator);
  const hash = encodedHash.slice(separator + 1);
  if (!/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const expected = Buffer.from(hash, "hex");
  const supplied = scryptSync(password, salt, expected.length);
  return timingSafeEqual(supplied, expected);
}
