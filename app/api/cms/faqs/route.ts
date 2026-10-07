import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canEditCms } from "@/lib/cms-auth";
import { getCmsDatabase as db } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  if (!await canEditCms()) return NextResponse.json({ error: "Sign in to manage FAQs." }, { status: 401 });
  const data = db().prepare("SELECT id, question, answer, position, status, updated_at FROM cms_faqs ORDER BY position, question COLLATE NOCASE").all();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!await canEditCms()) return NextResponse.json({ error: "Sign in to manage FAQs." }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "FAQ data is required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.question !== "string" || !data.question.trim() || data.question.length > 300
    || typeof data.answer !== "string" || !data.answer.trim() || data.answer.length > 5000) {
    return NextResponse.json({ error: "Provide a question (up to 300 characters) and answer (up to 5000 characters)." }, { status: 400 });
  }
  const status = data.status === "draft" ? "draft" : "published";
  const position = Number.isInteger(data.position) ? Math.max(0, Math.min(Number(data.position), 10000)) : 0;
  const id = randomUUID();
  db().prepare("INSERT INTO cms_faqs (id, question, answer, position, status) VALUES (?, ?, ?, ?, ?)")
    .run(id, data.question.trim(), data.answer.trim(), position, status);
  return NextResponse.json({ data: db().prepare("SELECT * FROM cms_faqs WHERE id = ?").get(id) }, { status: 201 });
}
