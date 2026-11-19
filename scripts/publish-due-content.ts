import { publishDueCmsContent } from "@/lib/cms-maintenance";
import { runCmsJob } from "@/lib/cms-job-status";

try {
  const published = await runCmsJob(
    "publishing",
    publishDueCmsContent,
    (count) => `${count} scheduled item${count === 1 ? "" : "s"} published.`,
  );
  console.info(`Scheduled content published: ${published}.`);
} catch (error) {
  console.error("Scheduled content publishing failed.", error);
  process.exitCode = 1;
}
