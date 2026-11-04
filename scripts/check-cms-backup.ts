import { checkCmsBackupFreshness } from "@/lib/cms-backup";
import { runCmsJob } from "@/lib/cms-job-status";

const maxAgeHours = Number(process.env.CMS_BACKUP_MAX_AGE_HOURS || 26);
try {
  const result = await runCmsJob("backup-check", async () => {
    if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
      throw new Error("CMS_BACKUP_MAX_AGE_HOURS must be a positive number.");
    }
    const check = await checkCmsBackupFreshness(maxAgeHours);
    if (!check.fresh) {
      throw new Error(`Latest CMS backup is stale (${check.ageHours?.toFixed(1)} hours old).`);
    }
    return check;
  }, (check) => `Latest backup is fresh (${check.ageHours?.toFixed(1)} hours old).`);
  console.info(`Latest CMS backup is fresh (${result.ageHours?.toFixed(1)} hours old).`);
} catch (error) {
  console.error("CMS backup freshness check failed.", error);
  process.exitCode = 1;
}
