import { retryExhaustedEnquiryNotifications } from "@/lib/cms-notifications";

try {
  const count = retryExhaustedEnquiryNotifications();
  console.info(`${count} exhausted enquiry notification(s) queued for retry.`);
} catch (error) {
  console.error("Unable to requeue exhausted enquiry notifications.", error);
  process.exitCode = 1;
}
