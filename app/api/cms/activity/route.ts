import { NextResponse } from "next/server";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_audit_log WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") || "").trim().slice(0, 100);
  const action = (url.searchParams.get("action") || "").trim().slice(0, 80);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from && !isDate(from)) || (to && !isDate(to)) || (from && to && from > to)) {
    return NextResponse.json({ error: "Choose a valid activity date range." }, { status: 400 });
  }
  const clauses: string[] = [];
  const parameters: string[] = [];
  if (search) {
    const term = `%${search}%`;
    clauses.push("(actor_name LIKE ? OR action LIKE ? OR resource_type LIKE ? OR summary LIKE ?)");
    parameters.push(term, term, term, term);
  }
  if (action) { clauses.push("action = ?"); parameters.push(action); }
  if (from) { clauses.push("substr(created_at, 1, 10) >= ?"); parameters.push(from); }
  if (to) { clauses.push("substr(created_at, 1, 10) <= ?"); parameters.push(to); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const total = (database.prepare(`SELECT COUNT(*) AS count FROM cms_audit_log ${where}`).get(...parameters) as { count: number }).count;
  const requestedLimit = Number(url.searchParams.get("limit") || 25);
  const pageSize = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 100)) : 25;
  const requestedPage = Number(url.searchParams.get("page") || 1);
  const page = Math.min(Number.isInteger(requestedPage) ? Math.max(1, requestedPage) : 1, Math.max(1, Math.ceil(total / pageSize)));
  const data = database.prepare(`
    SELECT id, actor_name, action, resource_type, resource_id, summary, location, created_at
    FROM cms_audit_log ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?
  `).all(...parameters, pageSize, (page - 1) * pageSize);
  const actions = database.prepare("SELECT DISTINCT action FROM cms_audit_log ORDER BY action").all() as { action: string }[];
  return NextResponse.json({ data, actions: actions.map((item) => item.action), pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) } }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
