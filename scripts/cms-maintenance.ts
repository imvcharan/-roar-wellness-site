import { runCmsMaintenance } from "@/lib/cms-maintenance";
import { runCmsJob } from "@/lib/cms-job-status";

try {
  const summary = await runCmsJob(
    "maintenance",
    runCmsMaintenance,
    (result) => `Removed ${result.enquiries + result.analyticsEvents + result.auditEvents + result.captchaChallenges + result.loginChallenges + result.sessions + result.rateLimits} expired records and cleared ${result.pendingMfaSetups} expired MFA setups.`,
  );
  console.info("CMS maintenance completed.", summary);
} catch (error) {
  console.error("CMS maintenance failed.", error);
  process.exitCode = 1;
}
