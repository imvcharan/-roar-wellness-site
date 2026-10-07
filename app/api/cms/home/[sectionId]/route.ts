import { NextResponse } from "next/server";
import { canEditCms, isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { parseHomepageSection } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const { sectionId } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Homepage card data is required." }, { status: 400 });
  const data = body as Record<string, unknown>;
  const existing = getCmsDatabase().prepare("SELECT * FROM cms_home_sections WHERE section_key = ? AND group_name != 'site-copy'").get(sectionId);
  if (!existing) return NextResponse.json({ error: "Homepage card was not found." }, { status: 404 });
  const parsed = { ...(existing as Record<string, unknown>), ...data };
  let section: ReturnType<typeof parseHomepageSection>;
  try {
    section = parseHomepageSection(parsed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid homepage card." }, { status: 400 });
  }
  getCmsDatabase().prepare("UPDATE cms_home_sections SET group_name = ?, heading = ?, eyebrow = ?, body = ?, image_url = ?, position = ?, is_published = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE section_key = ?")
    .run(section.group_name, section.heading, section.eyebrow, section.body, section.image_url, section.position, section.is_published, sectionId);
  return NextResponse.json({ data: getCmsDatabase().prepare("SELECT * FROM cms_home_sections WHERE section_key = ?").get(sectionId) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required to remove homepage cards." }, { status: 403 });
  const { sectionId } = await params;
  const result = getCmsDatabase().prepare("DELETE FROM cms_home_sections WHERE section_key = ? AND group_name != 'site-copy'").run(sectionId);
  if (!result.changes) return NextResponse.json({ error: "Card not found or a fixed homepage section cannot be deleted." }, { status: 404 });
  return NextResponse.json({ data: { deleted: true } });
}
