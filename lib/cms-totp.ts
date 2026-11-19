import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getCmsDatabase, withCmsTransaction } from "@/lib/cms-db";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function legacyEncryptionKey(): Buffer {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("CMS_SESSION_SECRET must be configured to protect authenticator secrets.");
  return createHash("sha256").update(secret).digest();
}

function parseTotpEncryptionKey(value: string | undefined, variable: string): Buffer | null {
  const encoded = value?.trim();
  if (!encoded) return null;
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32 || key.toString("base64") !== encoded) {
    throw new Error(`${variable} must be a base64-encoded 32-byte key.`);
  }
  return key;
}

function keyId(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function currentTotpEncryptionKey(): Buffer {
  return parseTotpEncryptionKey(process.env.CMS_TOTP_ENCRYPTION_KEY, "CMS_TOTP_ENCRYPTION_KEY")
    ?? legacyEncryptionKey();
}

function keyForId(id: string): Buffer {
  const currentKey = parseTotpEncryptionKey(process.env.CMS_TOTP_ENCRYPTION_KEY, "CMS_TOTP_ENCRYPTION_KEY");
  if (currentKey && keyId(currentKey) === id) return currentKey;
  const previousKey = parseTotpEncryptionKey(process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS, "CMS_TOTP_ENCRYPTION_KEY_PREVIOUS");
  if (previousKey && keyId(previousKey) === id) return previousKey;
  throw new Error("Stored authenticator secret requires a configured current or previous TOTP encryption key.");
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
  const key = currentTotpEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const encoded = [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
  const currentKey = parseTotpEncryptionKey(process.env.CMS_TOTP_ENCRYPTION_KEY, "CMS_TOTP_ENCRYPTION_KEY");
  return currentKey ? `v2.${keyId(currentKey)}.${encoded}` : encoded;
}

export function decryptTotpSecret(encoded: string): string {
  const parts = encoded.split(".");
  const versioned = parts[0] === "v2";
  const id = versioned ? parts[1] : null;
  const encryptedParts = versioned ? parts.slice(2) : parts;
  const [ivPart, tagPart, ciphertextPart, extra] = encryptedParts;
  if (!ivPart || !tagPart || !ciphertextPart || extra) throw new Error("Stored authenticator secret is invalid.");
  if (versioned && !id) throw new Error("Stored authenticator secret is invalid.");
  const key = versioned ? keyForId(id!) : legacyEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
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

export async function consumeTotpRecoveryCode(userId: string, code: unknown): Promise<boolean> {
  if (typeof code !== "string" || !/^[\da-fA-F -]{12,24}$/.test(code)) return false;
  const result = await getCmsDatabase().prepare(
    "DELETE FROM cms_totp_recovery_codes WHERE user_id = ? AND code_hash = ?",
  ).run(userId, hashRecoveryCode(code));
  return result.changes === 1;
}

export async function reencryptCmsTotpSecrets(): Promise<number> {
  if (!parseTotpEncryptionKey(process.env.CMS_TOTP_ENCRYPTION_KEY, "CMS_TOTP_ENCRYPTION_KEY")) {
    throw new Error("Set CMS_TOTP_ENCRYPTION_KEY before migrating authenticator secrets.");
  }
  const database = getCmsDatabase();
  let migrated = 0;
  await withCmsTransaction(async () => {
    const users = await database.prepare(`
      SELECT id, totp_secret_enc, totp_pending_secret_enc
      FROM cms_users
      WHERE totp_secret_enc IS NOT NULL OR totp_pending_secret_enc IS NOT NULL
    `).all() as {
      id: string;
      totp_secret_enc: string | null;
      totp_pending_secret_enc: string | null;
    }[];
    for (const user of users) {
      const activeSecret = user.totp_secret_enc ? encryptTotpSecret(decryptTotpSecret(user.totp_secret_enc)) : null;
      const pendingSecret = user.totp_pending_secret_enc
        ? encryptTotpSecret(decryptTotpSecret(user.totp_pending_secret_enc))
        : null;
      await database.prepare(`
        UPDATE cms_users SET totp_secret_enc = ?, totp_pending_secret_enc = ? WHERE id = ?
      `).run(activeSecret, pendingSecret, user.id);
      migrated += 1;
    }
  });
  return migrated;
}
