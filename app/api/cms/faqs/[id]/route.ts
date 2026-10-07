import { NextResponse } from "next/server";
import { canEditCms, isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await canEditCms()) return NextResponse.json({ error: "Sign in to manage FAQs." }, { status: 401 });
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "FAQ data is required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.question !== "string" || !data.question.trim() || data.question.length > 300
    || typeof data.answer !== "string" || !data.answer.trim() || data.answer.length > 5000
    || (data.status !== "draft" && data.status !== "published")) {
    return NextResponse.json({ error: "Provide a question, answer, and valid publication status." }, { status: 400 });
  }
  const result = getCmsDatabase().prepare("UPDATE cms_faqs SET question = ?, answer = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
    .run(data.question.trim(), data.answer.trim(), data.status, id);
  if (!result.changes) return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
  return NextResponse.json({ data: getCmsDatabase().prepare("SELECT * FROM cms_faqs WHERE id = ?").get(id) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required to delete FAQs." }, { status: 403 });
  const { id } = await params;
  const result = getCmsDatabase().prepare("DELETE FROM cms_faqs WHERE id = ?").run(id);
  if (!result.changes) return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
  return NextResponse.json({ data: { deleted: true } });
}
