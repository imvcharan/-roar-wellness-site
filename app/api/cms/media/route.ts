import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { canEditCms } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsMediaDirectory, getCmsMediaFilePath } from "@/lib/cms-media-storage";

export const runtime = "nodejs";
const maxUploadBytes = 50 * 1024 * 1024;

export async function GET() {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const data = getCmsDatabase().prepare("SELECT id, filename, url, mime_type, size, width, height, created_at FROM cms_media ORDER BY created_at DESC").all();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  if (!await canEditCms()) return NextResponse.json({ error: "Editor access is required." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxUploadBytes + 1024 * 1024) return NextResponse.json({ error: "Image upload must be 50 MB or smaller." }, { status: 413 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a valid image file using multipart form data." }, { status: 400 });
  }
  const upload = form.get("file");
  if (!(upload instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  if (upload.size < 1 || upload.size > maxUploadBytes) return NextResponse.json({ error: "Image upload must be between 1 byte and 50 MB." }, { status: 413 });

  const input = Buffer.from(await upload.arrayBuffer());
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" }).metadata();
  } catch {
    return NextResponse.json({ error: "The uploaded file is not a supported, valid image." }, { status: 415 });
  }
  if (!metadata.width || !metadata.height || !["jpeg", "png", "webp", "gif", "tiff", "avif"].includes(metadata.format || "")) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF, TIFF, or AVIF image." }, { status: 415 });
  }

  const id = randomUUID();
  const filename = upload.name.slice(0, 255) || `${id}.webp`;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const directory = getCmsMediaDirectory();
  const filePath = getCmsMediaFilePath(id);
  let output: Buffer;
  try {
    output = await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch (error) {
    console.error("Unable to optimize uploaded image.", error);
    return NextResponse.json({ error: "The image could not be optimized. Try a different image file." }, { status: 422 });
  }
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(filePath, output, { flag: "wx" });
  } catch (error) {
    console.error("Unable to store uploaded image.", error);
    return NextResponse.json({ error: "Image storage is unavailable. Check the configured persistent media directory and try again." }, { status: 500 });
  }
  const dimensions = await sharp(output).metadata();
  const url = `/api/media/${id}`;
  try {
    getCmsDatabase().prepare("INSERT INTO cms_media (id, filename, url, mime_type, size, width, height) VALUES (?, ?, ?, 'image/webp', ?, ?, ?)")
      .run(id, filename, url, output.length, dimensions.width, dimensions.height);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    try {
      await unlink(filePath);
    } catch (cleanupError) {
      console.error("Unable to remove media file after database insert failed.", cleanupError);
    }
    throw error;
  }
  return NextResponse.json({
    data: { id, filename, url, mime_type: "image/webp", size: output.length, width: dimensions.width, height: dimensions.height },
  }, { status: 201 });
}
