import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import type { CmsRole } from "@/lib/cms-auth";

export const runtime = "nodejs";

function isCmsRole(role: unknown): role is CmsRole {
  return role === "admin" || role === "editor" || role === "viewer";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "User changes are required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (!isCmsRole(data.role)) return NextResponse.json({ error: "Choose a valid user role." }, { status: 400 });
  const database = getCmsDatabase();
  const target = database.prepare("SELECT id, role FROM cms_users WHERE id = ?").get(id) as { id: string; role: string } | undefined;
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (target.role === "admin" && data.role !== "admin") {
    const admins = database.prepare("SELECT COUNT(*) AS count FROM cms_users WHERE role = 'admin'").get() as { count: number };
    if (admins.count <= 1) return NextResponse.json({ error: "The last administrator cannot be demoted." }, { status: 409 });
  }
  database.prepare("UPDATE cms_users SET role = ? WHERE id = ?").run(data.role, id);
  return NextResponse.json({ data: { id, role: data.role } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  if (id === await getCmsUserId()) return NextResponse.json({ error: "You cannot delete your own active account." }, { status: 409 });
  const database = getCmsDatabase();
  const target = database.prepare("SELECT id, role FROM cms_users WHERE id = ?").get(id) as { id: string; role: string } | undefined;
  if (!target) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (target.role === "admin") {
    const admins = database.prepare("SELECT COUNT(*) AS count FROM cms_users WHERE role = 'admin'").get() as { count: number };
    if (admins.count <= 1) return NextResponse.json({ error: "The last administrator cannot be deleted." }, { status: 409 });
  }
  database.prepare("DELETE FROM cms_users WHERE id = ?").run(id);
  return NextResponse.json({ data: { deleted: true } });
}
