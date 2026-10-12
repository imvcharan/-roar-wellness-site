import { NextResponse } from "next/server";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  const data = database.prepare(`
    SELECT id, name, email, phone, source, status, created_at, updated_at
    FROM cms_enquiries ORDER BY
      CASE status WHEN 'new' THEN 0 WHEN 'contacted' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END,
      created_at DESC
  `).all();
  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enquiry update data is required." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enquiry update data is required." }, { status: 400 });
  }
  const { id, status } = body as Record<string, unknown>;
  if (typeof id !== "string" || typeof status !== "string"
    || !["new", "contacted", "scheduled", "closed"].includes(status)) {
    return NextResponse.json({ error: "Choose a valid enquiry and status." }, { status: 400 });
  }
  const database = getCmsDatabase();
  const result = database.prepare(`
    UPDATE cms_enquiries SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(status, id);
  if (!result.changes) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  recordCmsAudit(await getCmsUserId(), request, "enquiry.status", "enquiry", id, `Changed enquiry status to ${status}.`);
  return NextResponse.json({ data: database.prepare("SELECT id, name, email, phone, source, status, created_at, updated_at FROM cms_enquiries WHERE id = ?").get(id) });
}

export async function DELETE(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Choose an enquiry to delete." }, { status: 400 });
  const result = getCmsDatabase().prepare("DELETE FROM cms_enquiries WHERE id = ?").run(id);
  if (!result.changes) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  recordCmsAudit(await getCmsUserId(), request, "enquiry.delete", "enquiry", id, "Deleted an appointment enquiry.");
  return NextResponse.json({ data: { deleted: true } });
}
