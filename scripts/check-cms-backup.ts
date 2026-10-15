import { checkCmsBackupFreshness } from "@/lib/cms-backup";

const maxAgeHours = Number(process.env.CMS_BACKUP_MAX_AGE_HOURS || 26);
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) {
  console.error("CMS_BACKUP_MAX_AGE_HOURS must be a positive number.");
  process.exitCode = 1;
} else {
  try {
    const result = await checkCmsBackupFreshness(maxAgeHours);
    if (!result.fresh) {
      console.error(`Latest CMS backup is stale (${result.ageHours?.toFixed(1)} hours old).`);
      process.exitCode = 1;
    } else {
      console.info(`Latest CMS backup is fresh (${result.ageHours?.toFixed(1)} hours old).`);
    }
  } catch (error) {
    console.error("CMS backup freshness check failed.", error);
    process.exitCode = 1;
  }
}
