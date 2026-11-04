import { processPendingEnquiryNotifications } from "@/lib/cms-notifications";
import { runCmsJob } from "@/lib/cms-job-status";

try {
  const result = await runCmsJob("notifications", () => processPendingEnquiryNotifications(50), (summary) =>
    `${summary.sent} sent, ${summary.failed} failed, ${summary.exhausted} exhausted.`,
    (summary) => summary.failed === 0 && summary.exhausted === 0,
  );
  console.info(`Enquiry notifications processed: ${result.sent} sent, ${result.failed} failed, ${result.exhausted} exhausted.`);
  if (result.failed > 0 || result.exhausted > 0) process.exitCode = 1;
} catch (error) {
  console.error("Enquiry notification processing failed.", error);
  process.exitCode = 1;
}
