import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const magic = Buffer.from("ROARBAK1");
const ivLength = 12;
const tagLength = 16;

export function parseCmsBackupKey(value: string | undefined): Buffer {
  if (!value) throw new Error("CMS_BACKUP_ENCRYPTION_KEY must be configured.");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64").replace(/=+$/, "") !== value.trim().replace(/=+$/, "")) {
    throw new Error("CMS_BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptCmsBackup(plaintext: Buffer, key: Buffer): Buffer {
  if (key.length !== 32) throw new Error("CMS backup encryption requires a 32-byte key.");
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptCmsBackup(envelope: Buffer, key: Buffer): Buffer {
  if (key.length !== 32 || envelope.length < magic.length + ivLength + tagLength
    || !envelope.subarray(0, magic.length).equals(magic)) {
    throw new Error("Invalid encrypted CMS backup.");
  }
  const ivStart = magic.length;
  const tagStart = ivStart + ivLength;
  const ciphertextStart = tagStart + tagLength;
  const decipher = createDecipheriv("aes-256-gcm", key, envelope.subarray(ivStart, tagStart));
  decipher.setAuthTag(envelope.subarray(tagStart, ciphertextStart));
  return Buffer.concat([decipher.update(envelope.subarray(ciphertextStart)), decipher.final()]);
}
