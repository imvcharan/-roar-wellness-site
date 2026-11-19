import { gzipSync, gunzipSync } from "node:zlib";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { decryptCmsBackup, encryptCmsBackup, parseCmsBackupKey } from "@/lib/cms-backup-crypto";
import { getCmsBackupPayload } from "@/lib/cms-backup-data";

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

export async function createAndUploadCmsBackup(): Promise<{ key: string; createdAt: string }> {
  const config = getS3Configuration();
  const key = parseCmsBackupKey(process.env.CMS_BACKUP_ENCRYPTION_KEY);
  const payload = await getCmsBackupPayload();
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
    Metadata: { format: "roar-cms-backup", version: "3", createdAt },
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
  if (backup.format !== "roar-cms-backup" || (backup.version !== 2 && backup.version !== 3) || !Array.isArray(backup.categories)
    || !Array.isArray(backup.content) || !Array.isArray(backup.media) || !Array.isArray(backup.mediaFiles)
    || !Array.isArray(backup.enquiries) || !Array.isArray(backup.auditLog) || !Array.isArray(backup.analyticsEvents)
    || (backup.version === 3 && (!Array.isArray(backup.engagement) || !Array.isArray(backup.likes)))) {
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
