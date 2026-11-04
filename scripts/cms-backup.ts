import { createAndUploadCmsBackup } from "@/lib/cms-backup";
import { runCmsJob } from "@/lib/cms-job-status";

try {
  const result = await runCmsJob("backup", createAndUploadCmsBackup, () => "Encrypted backup uploaded.");
  console.info(`Encrypted CMS backup uploaded: ${result.key} (${result.createdAt}).`);
} catch (error) {
  console.error("CMS backup failed.", error);
  process.exitCode = 1;
}
