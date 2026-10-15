import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptCmsBackup, encryptCmsBackup, parseCmsBackupKey } from "../lib/cms-backup-crypto.ts";

describe("encrypted CMS backups", () => {
  const key = Buffer.alloc(32, 7);

  it("round-trips payload bytes with authenticated encryption", () => {
    const payload = Buffer.from('{"format":"roar-cms-backup","version":2}');
    assert.deepEqual(decryptCmsBackup(encryptCmsBackup(payload, key), key), payload);
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptCmsBackup(Buffer.from("sensitive data"), key);
    encrypted[encrypted.length - 1] ^= 1;
    assert.throws(() => decryptCmsBackup(encrypted, key));
  });

  it("requires a base64-encoded 32-byte key", () => {
    assert.deepEqual(parseCmsBackupKey(key.toString("base64")), key);
    assert.throws(() => parseCmsBackupKey(undefined), /must be configured/);
    assert.throws(() => parseCmsBackupKey(Buffer.alloc(16).toString("base64")), /32-byte key/);
  });
});
