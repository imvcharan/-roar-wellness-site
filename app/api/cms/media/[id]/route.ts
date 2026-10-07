import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { isCmsAdmin } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsMediaFilePath } from "@/lib/cms-media-storage";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required to delete media." }, { status: 403 });
  const { id } = await params;
  const database = getCmsDatabase();
  const media = database.prepare("SELECT url FROM cms_media WHERE id = ?").get(id) as { url: string } | undefined;
  if (!media) return NextResponse.json({ error: "Media item was not found." }, { status: 404 });
  const urlPath = media.url.startsWith("/") ? media.url : new URL(media.url).pathname;
  if (urlPath !== `/api/media/${id}` && urlPath !== `/uploads/${id}.webp`) {
    return NextResponse.json({ error: "Media path is invalid; refusing to delete a file outside the upload library." }, { status: 409 });
  }
  const urlPattern = `%${urlPath}%`;
  const contentUsage = database.prepare(`
    SELECT COUNT(*) AS count FROM content
    WHERE image_url = ? OR image_url LIKE ? OR content LIKE ? OR description LIKE ?
  `).get(media.url, urlPattern, urlPattern, urlPattern) as { count: number };
  const homepageUsage = database.prepare(`
    SELECT COUNT(*) AS count FROM cms_home_sections WHERE image_url = ? OR image_url LIKE ?
  `).get(media.url, urlPattern) as { count: number };
  if (contentUsage.count || homepageUsage.count) {
    return NextResponse.json({ error: "This image is used by website content. Replace those images before deleting it." }, { status: 409 });
  }
  const storagePath = getCmsMediaFilePath(id);
  const legacyPath = join(process.cwd(), "public", "uploads", `${id}.webp`);
  const filePath = existsSync(storagePath)
    ? storagePath
    : urlPath === `/uploads/${id}.webp` ? legacyPath : storagePath;
  await unlink(filePath);
  database.prepare("DELETE FROM cms_media WHERE id = ?").run(id);
  return NextResponse.json({ data: { deleted: true } });
}
