import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { galleryImageAlts, galleryImages } from "@/lib/gallery-images";

export const runtime = "nodejs";

export async function GET() {
  const database = getCmsDatabase();
  const rows = database.prepare(
    "SELECT id, image_url, alt_text, caption, position, is_published FROM cms_gallery_images WHERE is_published = 1 ORDER BY position, created_at DESC",
  ).all() as Array<{ id: string; image_url: string; alt_text: string; caption: string | null; position: number; is_published: number }>;
  const galleryManaged = Boolean(database.prepare(
    "SELECT 1 FROM cms_bootstrap_state WHERE key = 'gallery-defaults-v1'",
  ).get());

  const data = galleryManaged
    ? rows.map((row) => ({
        id: row.id,
        image_url: row.image_url,
        alt_text: row.alt_text || row.caption || "Roar Wellness gallery image",
        caption: row.caption,
        position: row.position,
        is_published: row.is_published,
      }))
    : galleryImages.map((imageUrl, index) => ({
        id: `fallback-${index}`,
        image_url: imageUrl,
        alt_text: galleryImageAlts[index] ?? "Roar Wellness gallery image",
        caption: null,
        position: index,
        is_published: 1,
      }));

  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
