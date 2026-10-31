import { NextResponse } from "next/server";
import { canEditCms, getCmsUserId } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";
import { isAllowedImageUrl } from "@/lib/cms-validation";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const { id } = await params;
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

  const database = getCmsDatabase();
  const existing = database.prepare("SELECT 1 FROM cms_gallery_images WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  database.prepare(
    "UPDATE cms_gallery_images SET image_url = ?, alt_text = ?, caption = ?, position = ?, is_published = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
  ).run(imageUrl, altText, caption, position, isPublished ? 1 : 0, id);
  recordCmsAudit(await getCmsUserId(), request, "gallery.update", "gallery", id, `Updated a gallery image.`);
  return NextResponse.json({ data: database.prepare("SELECT * FROM cms_gallery_images WHERE id = ?").get(id) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const { id } = await params;
  const database = getCmsDatabase();
  const existing = database.prepare("SELECT 1 FROM cms_gallery_images WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "Gallery image not found." }, { status: 404 });
  database.prepare("DELETE FROM cms_gallery_images WHERE id = ?").run(id);
  recordCmsAudit(await getCmsUserId(), _request, "gallery.delete", "gallery", id, "Deleted a gallery image.");
  return NextResponse.json({ success: true });
}
