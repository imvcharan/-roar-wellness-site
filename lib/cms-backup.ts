import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { DatabaseSync } from "node:sqlite";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getCmsDatabase } from "@/lib/cms-db";
import { decryptCmsBackup, encryptCmsBackup, parseCmsBackupKey } from "@/lib/cms-backup-crypto";
import { getCmsMediaFilePath, isCmsMediaId } from "@/lib/cms-media-storage";

interface BackupMedia {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  created_at: string;
}

interface BackupPayload {
  format: "roar-cms-backup";
  version: 2;
  createdAt: string;
  categories: unknown[];
  content: unknown[];
  revisions: unknown[];
  faqs: unknown[];
  settings: unknown[];
  homeSections: unknown[];
  galleryImages: unknown[];
  urlRedirects: unknown[];
  media: BackupMedia[];
  mediaFiles: { filename: string; base64: string }[];
  enquiries: unknown[];
  auditLog: unknown[];
  analyticsEvents: unknown[];
}

function getS3Configuration() {
  const bucket = process.env.CMS_BACKUP_S3_BUCKET?.trim();
  const region = process.env.CMS_BACKUP_S3_REGION?.trim();
  if (!bucket || !region) throw new Error("CMS_BACKUP_S3_BUCKET and CMS_BACKUP_S3_REGION must be configured.");
  return {
    bucket,
    region,
    endpoint: process.env.CMS_BACKUP_S3_ENDPOINT?.trim() || undefined,
    pointerKey: process.env.CMS_BACKUP_S3_POINTER_KEY?.trim() || "roar-cms/latest.json",
    prefix: (process.env.CMS_BACKUP_S3_PREFIX?.trim() || "roar-cms").replace(/^\/+|\/+$/g, ""),
  };
}

function createS3Client(region: string, endpoint?: string): S3Client {
  return new S3Client({ region, endpoint, forcePathStyle: Boolean(endpoint) });
}

async function getBackupPayload(): Promise<BackupPayload> {
  const database = getCmsDatabase();
  const snapshotPath = join(tmpdir(), `roar-cms-${randomUUID()}.sqlite`);
  const escapedPath = snapshotPath.replace(/'/g, "''");
  database.exec(`VACUUM INTO '${escapedPath}'`);
  const snapshot = new DatabaseSync(snapshotPath, { readOnly: true });
  try {
    const media = snapshot.prepare(
      "SELECT id, filename, url, mime_type, size, width, height, created_at FROM cms_media",
    ).all() as unknown as BackupMedia[];
    const mediaFiles: BackupPayload["mediaFiles"] = [];
    for (const item of media) {
      if (!isCmsMediaId(item.id)) throw new Error(`Invalid media identifier for ${item.filename}.`);
      const filename = `${item.id}.webp`;
      if (item.url !== `/uploads/${filename}` && item.url !== `/api/media/${item.id}`) {
        throw new Error(`Invalid media storage path for ${item.id}.`);
      }
      let bytes: Buffer;
      try {
        bytes = await readFile(item.url === `/uploads/${filename}`
          ? join(process.cwd(), "public", "uploads", filename)
          : getCmsMediaFilePath(item.id));
      } catch (error) {
        if (item.url !== `/uploads/${filename}` || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        bytes = await readFile(getCmsMediaFilePath(item.id));
      }
      mediaFiles.push({ filename, base64: bytes.toString("base64") });
    }
    const rows = (sql: string) => snapshot.prepare(sql).all();
    return {
      format: "roar-cms-backup",
      version: 2,
      createdAt: new Date().toISOString(),
      categories: rows("SELECT id, name, slug, is_default, created_at FROM categories"),
      content: rows("SELECT * FROM content"),
      revisions: rows("SELECT id, content_id, snapshot, created_by, created_at FROM cms_revisions"),
      faqs: rows("SELECT * FROM cms_faqs"),
      settings: rows("SELECT key, value, updated_at FROM cms_settings"),
      homeSections: rows("SELECT * FROM cms_home_sections"),
      galleryImages: rows("SELECT * FROM cms_gallery_images"),
      urlRedirects: rows("SELECT source_path, content_id, created_at FROM cms_url_redirects"),
      media,
      mediaFiles,
      enquiries: rows("SELECT id, name, email, phone, source, status, assigned_user_id, follow_up_at, created_at, updated_at FROM cms_enquiries"),
      auditLog: rows("SELECT id, actor_name, action, resource_type, resource_id, summary, location, created_at FROM cms_audit_log"),
      analyticsEvents: rows("SELECT id, event_type, page_path, created_at FROM cms_analytics_events"),
    };
  } finally {
    snapshot.close();
    await rm(snapshotPath, { force: true });
  }
}

export async function createAndUploadCmsBackup(): Promise<{ key: string; createdAt: string }> {
  const config = getS3Configuration();
  const key = parseCmsBackupKey(process.env.CMS_BACKUP_ENCRYPTION_KEY);
  const payload = await getBackupPayload();
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload)), { level: 9 });
  const encrypted = encryptCmsBackup(compressed, key);
  const createdAt = payload.createdAt;
  const backupKey = `${config.prefix}/${createdAt.replace(/[:.]/g, "-")}.enc`;
  const client = createS3Client(config.region, config.endpoint);
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: backupKey,
    Body: encrypted,
    ContentType: "application/octet-stream",
    Metadata: { format: "roar-cms-backup", version: "1", createdAt },
  }));
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: config.pointerKey,
    Body: JSON.stringify({ key: backupKey, createdAt }),
    ContentType: "application/json",
  }));
  return { key: backupKey, createdAt };
}

export async function checkCmsBackupFreshness(maxAgeHours: number): Promise<{ fresh: boolean; ageHours: number | null; key: string | null }> {
  const config = getS3Configuration();
  const client = createS3Client(config.region, config.endpoint);
  const pointerResponse = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: config.pointerKey }));
  const pointerText = await pointerResponse.Body?.transformToString();
  if (!pointerText) throw new Error("Off-site backup pointer is missing or empty.");
  const pointer = JSON.parse(pointerText) as { key?: unknown; createdAt?: unknown };
  if (typeof pointer.key !== "string" || typeof pointer.createdAt !== "string"
    || !pointer.key.startsWith(`${config.prefix}/`) || !Number.isFinite(Date.parse(pointer.createdAt))) {
    throw new Error("Off-site backup pointer is invalid.");
  }
  const object = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: pointer.key }));
  if (object.ContentLength === undefined || object.ContentLength <= 0) throw new Error("The latest off-site backup object is missing or empty.");
  const encryptedResponse = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: pointer.key }));
  const encryptedBytes = await encryptedResponse.Body?.transformToByteArray();
  if (!encryptedBytes?.length) throw new Error("The latest off-site backup could not be downloaded.");
  const plaintext = gunzipSync(decryptCmsBackup(
    Buffer.from(encryptedBytes), parseCmsBackupKey(process.env.CMS_BACKUP_ENCRYPTION_KEY),
  ));
  const payload: unknown = JSON.parse(plaintext.toString("utf8"));
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("The latest CMS backup is not a JSON object.");
  const backup = payload as Record<string, unknown>;
  if (backup.format !== "roar-cms-backup" || backup.version !== 2 || !Array.isArray(backup.categories)
    || !Array.isArray(backup.content) || !Array.isArray(backup.media) || !Array.isArray(backup.mediaFiles)
    || !Array.isArray(backup.enquiries) || !Array.isArray(backup.auditLog) || !Array.isArray(backup.analyticsEvents)) {
    throw new Error("The latest CMS backup payload is incomplete or unsupported.");
  }
  const modifiedTime = object.LastModified?.getTime() ?? Date.parse(pointer.createdAt);
  const ageHours = Math.max(0, (Date.now() - modifiedTime) / 3_600_000);
  return { fresh: ageHours <= maxAgeHours, ageHours, key: pointer.key };
}

export async function decryptCmsBackupFile(encryptedFile: Buffer): Promise<Buffer> {
  const key = parseCmsBackupKey(process.env.CMS_BACKUP_ENCRYPTION_KEY);
  return gunzipSync(decryptCmsBackup(encryptedFile, key));
}
