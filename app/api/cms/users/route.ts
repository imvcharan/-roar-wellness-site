import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { isCmsAdmin } from "@/lib/cms-auth";
import type { CmsRole } from "@/lib/cms-auth";

export const runtime = "nodejs";

function isCmsRole(role: unknown): role is CmsRole {
  return role === "admin" || role === "editor" || role === "viewer";
}

export async function GET() {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const data = getCmsDatabase()
    .prepare("SELECT id, email, name, role, created_at FROM cms_users ORDER BY created_at")
    .all();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "A user object is required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 100) {
    return NextResponse.json({ error: "Name is required and must be 100 characters or fewer." }, { status: 400 });
  }
  if (typeof data.password !== "string" || data.password.length < 12 || data.password.length > 1024) {
    return NextResponse.json({ error: "Password must be at least 12 characters." }, { status: 400 });
  }
  if (!isCmsRole(data.role)) {
    return NextResponse.json({ error: "Role must be admin, editor, or viewer." }, { status: 400 });
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(data.password, salt, 64).toString("hex");
  try {
    const id = randomUUID();
    getCmsDatabase().prepare("INSERT INTO cms_users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)")
      .run(id, data.email.trim().toLowerCase(), data.name.trim(), data.role, `${salt}:${hash}`);
    return NextResponse.json({ data: { id, email: data.email.trim().toLowerCase(), name: data.name.trim(), role: data.role } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "An account already exists for that email." }, { status: 409 });
    }
    throw error;
  }
}
