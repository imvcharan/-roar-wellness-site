import { NextResponse } from "next/server";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

const enquiryStatuses = ["new", "contacted", "scheduled", "closed"] as const;

export async function GET(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const requestedStatus = url.searchParams.get("status") || "all";
  if (requestedStatus !== "all" && !enquiryStatuses.includes(requestedStatus as typeof enquiryStatuses[number])) {
    return NextResponse.json({ error: "Choose a valid enquiry status filter." }, { status: 400 });
  }
  const status = requestedStatus;
  const requestedPage = Number(url.searchParams.get("page") || 1);
  const pageSize = 25;
  const requestedPageNumber = Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1;
  const clauses: string[] = [];
  const parameters: (string | number)[] = [];
  if (status !== "all") {
    clauses.push("e.status = ?");
    parameters.push(status);
  }
  if (search) {
    clauses.push("(e.name LIKE ? OR e.email LIKE ? OR e.phone LIKE ? OR e.source LIKE ?)");
    const term = `%${search}%`;
    parameters.push(term, term, term, term);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = (database.prepare(`SELECT COUNT(*) AS count FROM cms_enquiries e ${where}`).get(...parameters) as { count: number }).count;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPageNumber, pages);
  const summary = database.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new,
      SUM(CASE WHEN status != 'closed' THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status != 'closed' AND assigned_user_id IS NULL THEN 1 ELSE 0 END) AS unassigned,
      SUM(CASE WHEN status != 'closed' AND follow_up_at IS NOT NULL
        AND follow_up_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END) AS overdue
    FROM cms_enquiries
  `).get() as { total: number; new: number | null; open: number | null; unassigned: number | null; overdue: number | null };
  const data = url.searchParams.get("summary") === "1" ? [] : database.prepare(`
    SELECT e.id, e.name, e.email, e.phone, e.source, e.status, e.assigned_user_id,
      u.name AS assigned_user_name, e.follow_up_at, e.created_at, e.updated_at
    FROM cms_enquiries e LEFT JOIN cms_users u ON u.id = e.assigned_user_id
    ${where}
    ORDER BY CASE e.status WHEN 'new' THEN 0 WHEN 'contacted' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END,
      CASE WHEN e.follow_up_at IS NULL THEN 1 ELSE 0 END, e.follow_up_at ASC, e.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...parameters, pageSize, (page - 1) * pageSize);
  return NextResponse.json({
    data,
    pagination: { page, pageSize, total, pages },
    summary: { total: summary.total, new: summary.new ?? 0, open: summary.open ?? 0, unassigned: summary.unassigned ?? 0, overdue: summary.overdue ?? 0 },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
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
  const { id, status, assignedUserId, followUpAt } = body as Record<string, unknown>;
  const hasStatus = status !== undefined;
  const hasAssignedUser = assignedUserId !== undefined;
  const hasFollowUp = followUpAt !== undefined;
  if (typeof id !== "string" || !id || (!hasStatus && !hasAssignedUser && !hasFollowUp)
    || (hasStatus && (typeof status !== "string" || !enquiryStatuses.includes(status as typeof enquiryStatuses[number])))
    || (hasAssignedUser && assignedUserId !== null && typeof assignedUserId !== "string")
    || (hasFollowUp && followUpAt !== null && (typeof followUpAt !== "string" || !Number.isFinite(Date.parse(followUpAt))))) {
    return NextResponse.json({ error: "Choose a valid enquiry and update." }, { status: 400 });
  }
  const database = getCmsDatabase();
  if (hasAssignedUser && assignedUserId !== null
    && !database.prepare("SELECT 1 FROM cms_users WHERE id = ? AND role = 'admin'").get(assignedUserId)) {
    return NextResponse.json({ error: "Choose an existing administrator account." }, { status: 400 });
  }
  const assignments: string[] = [];
  const values: (string | null)[] = [];
  if (hasStatus) { assignments.push("status = ?"); values.push(status as string); }
  if (hasAssignedUser) { assignments.push("assigned_user_id = ?"); values.push(assignedUserId as string | null); }
  if (hasFollowUp) {
    assignments.push("follow_up_at = ?");
    values.push(typeof followUpAt === "string" ? new Date(followUpAt).toISOString() : null);
  }
  assignments.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  const result = database.prepare(`UPDATE cms_enquiries SET ${assignments.join(", ")} WHERE id = ?`)
    .run(...values, id);
  if (!result.changes) return NextResponse.json({ error: "Enquiry not found." }, { status: 404 });
  const changes = [
    hasStatus ? `status to ${status}` : "",
    hasAssignedUser ? "staff assignment" : "",
    hasFollowUp ? "follow-up date" : "",
  ].filter(Boolean).join(" and ");
  recordCmsAudit(await getCmsUserId(), request, "enquiry.update", "enquiry", id, `Updated enquiry ${changes}.`);
  return NextResponse.json({
    data: database.prepare(`SELECT e.id, e.name, e.email, e.phone, e.source, e.status, e.assigned_user_id,
      u.name AS assigned_user_name, e.follow_up_at, e.created_at, e.updated_at
      FROM cms_enquiries e LEFT JOIN cms_users u ON u.id = e.assigned_user_id WHERE e.id = ?`).get(id),
  });
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
