import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canEditCms, getCmsUserId } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";
import { isAllowedImageUrl } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function GET() {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const data = getCmsDatabase().prepare(
    "SELECT id, image_url, alt_text, caption, position, is_published, updated_at FROM cms_gallery_images ORDER BY position, created_at DESC",
  ).all();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A gallery image object is required." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const imageUrl = typeof data.image_url === "string" ? data.image_url.trim() : "";
  const altText = typeof data.alt_text === "string" ? data.alt_text.trim() : "";
  const caption = typeof data.caption === "string" ? data.caption.trim() : "";
  const position = Number.isFinite(Number(data.position)) ? Number(data.position) : 0;
  const isPublished = data.is_published === true || data.is_published === 1 || data.is_published === "true";

  if (!imageUrl || !isAllowedImageUrl(imageUrl)) {
    return NextResponse.json({ error: "Choose a valid image URL or uploaded media image." }, { status: 400 });
  }
  if (altText.length > 250) {
    return NextResponse.json({ error: "Image alt text must be 250 characters or fewer." }, { status: 400 });
  }
  if (caption.length > 250) {
    return NextResponse.json({ error: "Image caption must be 250 characters or fewer." }, { status: 400 });
  }

  const id = randomUUID();
  const database = getCmsDatabase();
  database.prepare(
    "INSERT INTO cms_gallery_images (id, image_url, alt_text, caption, position, is_published) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, imageUrl, altText, caption, position, isPublished ? 1 : 0);
  recordCmsAudit(await getCmsUserId(), request, "gallery.create", "gallery", id, `Added a gallery image.`);
  return NextResponse.json({ data: database.prepare("SELECT * FROM cms_gallery_images WHERE id = ?").get(id) }, { status: 201 });
}
