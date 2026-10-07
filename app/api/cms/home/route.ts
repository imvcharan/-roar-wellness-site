import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canEditCms } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { parseHomepageSection } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET() {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const data = getCmsDatabase().prepare("SELECT section_key, group_name, heading, eyebrow, body, image_url, position, is_published, updated_at FROM cms_home_sections WHERE group_name != 'site-copy' ORDER BY group_name, position, heading COLLATE NOCASE").all();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  let input: ReturnType<typeof parseHomepageSection>;
  try { input = parseHomepageSection(body); } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid homepage card." }, { status: 400 });
  }
  const sectionKey = randomUUID();
  const database = getCmsDatabase();
  database.prepare("INSERT INTO cms_home_sections (section_key, group_name, heading, eyebrow, body, image_url, position, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(sectionKey, input.group_name, input.heading, input.eyebrow, input.body, input.image_url, input.position, input.is_published);
  return NextResponse.json({ data: database.prepare("SELECT * FROM cms_home_sections WHERE section_key = ?").get(sectionKey) }, { status: 201 });
}
