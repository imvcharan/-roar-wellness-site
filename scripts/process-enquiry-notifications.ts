import { processPendingEnquiryNotifications } from "@/lib/cms-notifications";

try {
  const result = await processPendingEnquiryNotifications(50);
  console.info(`Enquiry notifications processed: ${result.sent} sent, ${result.failed} failed, ${result.exhausted} exhausted.`);
  if (result.failed > 0 || result.exhausted > 0) process.exitCode = 1;
} catch (error) {
  console.error("Enquiry notification processing failed.", error);
  process.exitCode = 1;
}
