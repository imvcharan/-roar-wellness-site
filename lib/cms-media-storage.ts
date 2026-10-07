import { join, resolve } from "node:path";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCmsMediaId(value: string): boolean {
  return uuidPattern.test(value);
}

export function getCmsMediaDirectory(): string {
  const configuredPath = process.env.CMS_MEDIA_DIRECTORY?.trim() || "data/media";
  return resolve(process.cwd(), configuredPath);
}

export function getCmsMediaFilePath(id: string): string {
  if (!isCmsMediaId(id)) throw new Error("Invalid media identifier.");
  return join(getCmsMediaDirectory(), `${id}.webp`);
}
