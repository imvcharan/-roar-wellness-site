import { NextResponse } from "next/server";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase, withCmsTransaction } from "@/lib/cms-db";
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
  const outcome = await withCmsTransaction(async () => {
    await database.exec("SELECT pg_advisory_xact_lock(721946004238)");
    const target = await database.prepare("SELECT id, role, name FROM cms_users WHERE id = ? FOR UPDATE")
      .get(id) as { id: string; role: string; name: string } | undefined;
    if (!target) return { error: "Account not found.", status: 404 as const };
    if (target.role === "admin" && data.role !== "admin") {
      const admins = await database.prepare("SELECT COUNT(*) AS count FROM cms_users WHERE role = 'admin'").get() as { count: number };
      if (admins.count <= 1) return { error: "The last administrator cannot be demoted.", status: 409 as const };
    }
    await database.prepare("UPDATE cms_users SET role = ? WHERE id = ?").run(data.role, id);
    return { target };
  });
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  const { target } = outcome;
  await recordCmsAudit(await getCmsUserId(), request, "user.role", "user", id, `Changed ${target.name}’s role from ${target.role} to ${data.role}.`);
  return NextResponse.json({ data: { id, role: data.role } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const { id } = await params;
  if (id === await getCmsUserId()) return NextResponse.json({ error: "You cannot delete your own active account." }, { status: 409 });
  const database = getCmsDatabase();
  const outcome = await withCmsTransaction(async () => {
    await database.exec("SELECT pg_advisory_xact_lock(721946004238)");
    const target = await database.prepare("SELECT id, role, name FROM cms_users WHERE id = ? FOR UPDATE")
      .get(id) as { id: string; role: string; name: string } | undefined;
    if (!target) return { error: "Account not found.", status: 404 as const };
    if (target.role === "admin") {
      const admins = await database.prepare("SELECT COUNT(*) AS count FROM cms_users WHERE role = 'admin'").get() as { count: number };
      if (admins.count <= 1) return { error: "The last administrator cannot be deleted.", status: 409 as const };
    }
    await database.prepare("DELETE FROM cms_users WHERE id = ?").run(id);
    return { target };
  });
  if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  const { target } = outcome;
  await recordCmsAudit(await getCmsUserId(), request, "user.delete", "user", id, `Removed account “${target.name}”.`);
  return NextResponse.json({ data: { deleted: true } });
}
