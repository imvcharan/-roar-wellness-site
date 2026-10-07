import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsMediaFilePath, isCmsMediaId } from "@/lib/cms-media-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCmsMediaId(id)) return new Response("Media not found.", { status: 404 });

  const media = getCmsDatabase().prepare("SELECT url, mime_type FROM cms_media WHERE id = ?")
    .get(id) as { url: string; mime_type: string } | undefined;
  if (!media) return new Response("Media not found.", { status: 404 });

  let image: Buffer;
  try {
    image = await readFile(getCmsMediaFilePath(id));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && media.url === `/uploads/${id}.webp`) {
      try {
        image = await readFile(join(process.cwd(), "public", "uploads", `${id}.webp`));
      } catch (legacyError) {
        if ((legacyError as NodeJS.ErrnoException).code === "ENOENT") {
          return new Response("Media file is missing.", { status: 404 });
        }
        throw legacyError;
      }
    } else if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("Media file is missing.", { status: 404 });
    } else {
      throw error;
    }
  }

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": media.mime_type,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
