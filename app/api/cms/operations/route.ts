import { NextResponse } from "next/server";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsJobRuns } from "@/lib/cms-job-status";
import { isCmsMediaStorageAvailable } from "@/lib/cms-media-health";
import { getEnquiryNotificationTransport, retryExhaustedEnquiryNotifications } from "@/lib/cms-notifications";

export const runtime = "nodejs";

export async function GET() {
  if (!await isCmsAdmin()) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const database = getCmsDatabase();
  const notifications = database.prepare(`
    SELECT
      SUM(CASE WHEN sent_at IS NULL AND attempts < 8 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN sent_at IS NULL AND attempts < 8
        AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END) AS due,
      SUM(CASE WHEN sent_at IS NULL AND attempts >= 8 THEN 1 ELSE 0 END) AS exhausted
    FROM cms_notification_outbox
  `).get() as { pending: number | null; due: number | null; exhausted: number | null };
  const publishing = database.prepare(`
    SELECT
      SUM(CASE WHEN status = 'draft' AND scheduled_publish_at IS NOT NULL THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN status = 'draft' AND scheduled_publish_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        THEN 1 ELSE 0 END) AS overdue,
      MIN(CASE WHEN status = 'draft' AND scheduled_publish_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        THEN scheduled_publish_at END) AS next_at
    FROM content
  `).get() as { scheduled: number | null; overdue: number | null; next_at: string | null };
  const jobs = getCmsJobRuns();

  return NextResponse.json({
    data: {
      mediaAvailable: await isCmsMediaStorageAvailable(),
      notifications: {
        configured: getEnquiryNotificationTransport() !== null,
        pending: notifications.pending ?? 0,
        due: notifications.due ?? 0,
        exhausted: notifications.exhausted ?? 0,
      },
      publishing: {
        scheduled: publishing.scheduled ?? 0,
        overdue: publishing.overdue ?? 0,
        nextAt: publishing.next_at,
      },
      jobs,
    },
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  if (!await isCmsAdmin()) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose an operations action." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)
    || (body as Record<string, unknown>).action !== "retry-exhausted-notifications") {
    return NextResponse.json({ error: "Choose a valid operations action." }, { status: 400 });
  }
  if (!getEnquiryNotificationTransport()) {
    return NextResponse.json({ error: "Configure SMTP before retrying enquiry alerts." }, { status: 503 });
  }
  const retried = retryExhaustedEnquiryNotifications();
  recordCmsAudit(
    await getCmsUserId(), request, "notification.retry", "notification", null,
    `Requeued ${retried} exhausted enquiry notification${retried === 1 ? "" : "s"}.`,
  );
  return NextResponse.json({ data: { retried } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
