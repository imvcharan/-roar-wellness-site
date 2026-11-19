import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { decryptTotpSecret, encryptTotpSecret } from "../lib/cms-totp.ts";

const originalSessionSecret = process.env.CMS_SESSION_SECRET;
const originalCurrentKey = process.env.CMS_TOTP_ENCRYPTION_KEY;
const originalPreviousKey = process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS;

afterEach(() => {
  if (originalSessionSecret === undefined) delete process.env.CMS_SESSION_SECRET;
  else process.env.CMS_SESSION_SECRET = originalSessionSecret;
  if (originalCurrentKey === undefined) delete process.env.CMS_TOTP_ENCRYPTION_KEY;
  else process.env.CMS_TOTP_ENCRYPTION_KEY = originalCurrentKey;
  if (originalPreviousKey === undefined) delete process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS;
  else process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS = originalPreviousKey;
});

describe("TOTP secret encryption", () => {
  it("continues to decrypt legacy secrets protected by the session secret", () => {
    process.env.CMS_SESSION_SECRET = "a".repeat(48);
    delete process.env.CMS_TOTP_ENCRYPTION_KEY;
    delete process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS;

    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");
    assert.equal(encrypted.split(".").length, 3);
    assert.equal(decryptTotpSecret(encrypted), "JBSWY3DPEHPK3PXP");
  });

  it("supports versioned keys and decrypts with a configured previous key during rotation", () => {
    process.env.CMS_SESSION_SECRET = "b".repeat(48);
    const previousKey = Buffer.alloc(32, 4).toString("base64");
    const currentKey = Buffer.alloc(32, 5).toString("base64");
    process.env.CMS_TOTP_ENCRYPTION_KEY = previousKey;
    delete process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS;
    const encrypted = encryptTotpSecret("JBSWY3DPEHPK3PXP");

    process.env.CMS_TOTP_ENCRYPTION_KEY = currentKey;
    process.env.CMS_TOTP_ENCRYPTION_KEY_PREVIOUS = previousKey;
    assert.equal(decryptTotpSecret(encrypted), "JBSWY3DPEHPK3PXP");
    const reencrypted = encryptTotpSecret(decryptTotpSecret(encrypted));
    assert.equal(decryptTotpSecret(reencrypted), "JBSWY3DPEHPK3PXP");
    assert.equal(
      reencrypted.split(".")[1],
      createHash("sha256").update(Buffer.from(currentKey, "base64")).digest("hex").slice(0, 16),
    );
  });

  it("rejects malformed encryption keys", () => {
    process.env.CMS_TOTP_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    assert.throws(() => encryptTotpSecret("JBSWY3DPEHPK3PXP"), /32-byte key/);
  });
});
