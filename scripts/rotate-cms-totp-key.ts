import { reencryptCmsTotpSecrets } from "@/lib/cms-totp";

try {
  const count = await reencryptCmsTotpSecrets();
  console.info(`Re-encrypted authenticator secrets for ${count} CMS account${count === 1 ? "" : "s"}.`);
} catch (error) {
  console.error("Authenticator-secret key migration failed.", error);
  process.exitCode = 1;
}
