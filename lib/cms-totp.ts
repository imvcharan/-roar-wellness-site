import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getCmsDatabase } from "@/lib/cms-db";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encryptionKey(): Buffer {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("CMS_SESSION_SECRET must be configured to protect authenticator secrets.");
  return createHash("sha256").update(secret).digest();
}

export function createTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0;
  let value = 0;
  let encoded = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      encoded += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) encoded += base32Alphabet[(value << (5 - bits)) & 31];
  return encoded;
}

function decodeBase32(value: string): Buffer {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/g, "")) {
    const digit = base32Alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid authenticator secret.");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(encoded: string): string {
  const [ivPart, tagPart, ciphertextPart, extra] = encoded.split(".");
  if (!ivPart || !tagPart || !ciphertextPart || extra) throw new Error("Stored authenticator secret is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function totpForCounter(secret: string, counter: bigint): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(counter);
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function matchTotpCounter(secret: string, code: unknown, now = Date.now()): bigint | null {
  if (typeof code !== "string" || !/^\d{6}$/.test(code)) return null;
  const supplied = Buffer.from(code);
  const currentCounter = BigInt(Math.floor(now / 30_000));
  for (const offset of [BigInt(-1), BigInt(0), BigInt(1)]) {
    const counter = currentCounter + offset;
    if (counter < BigInt(0)) continue;
    const expected = Buffer.from(totpForCounter(secret, counter));
    if (timingSafeEqual(expected, supplied)) return counter;
  }
  return null;
}

export function verifyTotp(secret: string, code: unknown, now = Date.now()): boolean {
  return matchTotpCounter(secret, code, now) !== null;
}

export function createTotpRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => randomBytes(9).toString("hex").toUpperCase());
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.replace(/[\s-]/g, "").toUpperCase()).digest("hex");
}

export function consumeTotpRecoveryCode(userId: string, code: unknown): boolean {
  if (typeof code !== "string" || !/^[\da-fA-F -]{12,24}$/.test(code)) return false;
  const result = getCmsDatabase().prepare(
    "DELETE FROM cms_totp_recovery_codes WHERE user_id = ? AND code_hash = ?",
  ).run(userId, hashRecoveryCode(code));
  return result.changes === 1;
}
