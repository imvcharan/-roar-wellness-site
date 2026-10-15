import { createAndUploadCmsBackup } from "@/lib/cms-backup";

try {
  const result = await createAndUploadCmsBackup();
  console.info(`Encrypted CMS backup uploaded: ${result.key} (${result.createdAt}).`);
} catch (error) {
  console.error("CMS backup failed.", error);
  process.exitCode = 1;
}
