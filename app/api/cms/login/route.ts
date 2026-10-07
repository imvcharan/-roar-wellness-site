import { NextResponse } from "next/server";
import {
  cmsAuthConfigured,
  cmsSessionCookieName,
  createCmsSession,
  verifyPassword,
} from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

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
  const { email, password } = body as Record<string, unknown>;
  if (typeof password !== "string" || password.length > 1024) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = getCmsDatabase()
    .prepare("SELECT id, email, name, role, password_hash FROM cms_users WHERE email = ? COLLATE NOCASE")
    .get(typeof email === "string" ? email.trim() : "") as {
      id: string; email: string; name: string; role: string; password_hash: string;
    } | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const session = createCmsSession(user.id);
  const response = NextResponse.json({ data: { user: { id: user.id, email: user.email, name: user.name, role: user.role } } });
  response.cookies.set(cmsSessionCookieName(), session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: session.maxAge,
  });
  return response;
}
