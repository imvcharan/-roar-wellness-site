import { NextResponse } from "next/server";
import { getCmsUserId, isCmsAdmin } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";
import { getCmsDatabase } from "@/lib/cms-db";
import { getCmsJobRuns } from "@/lib/cms-job-status";
import { isCmsMediaStorageAvailable } from "@/lib/cms-media-health";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";
import {
  getEnquiryNotificationTransport,
  retryExhaustedEnquiryNotifications,
  verifyEnquiryNotificationTransport,
} from "@/lib/cms-notifications";

export const runtime = "nodejs";

export async function GET() {
  if (!await isCmsAdmin()) {
    return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  }

  const database = getCmsDatabase();
  const notifications = await database.prepare(`
    SELECT
      SUM(CASE WHEN sent_at IS NULL AND attempts < 8 THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN sent_at IS NULL AND attempts < 8
        AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now') THEN 1 ELSE 0 END) AS due,
      SUM(CASE WHEN sent_at IS NULL AND attempts >= 8 THEN 1 ELSE 0 END) AS exhausted
    FROM cms_notification_outbox
  `).get() as { pending: number | null; due: number | null; exhausted: number | null };
  const publishing = await database.prepare(`
    SELECT
      SUM(CASE WHEN status = 'draft' AND scheduled_publish_at IS NOT NULL THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN status = 'draft' AND scheduled_publish_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        THEN 1 ELSE 0 END) AS overdue,
      MIN(CASE WHEN status = 'draft' AND scheduled_publish_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        THEN scheduled_publish_at END) AS next_at
    FROM content
  `).get() as { scheduled: number | null; overdue: number | null; next_at: string | null };
  const jobs = await getCmsJobRuns();

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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Choose a valid operations action." }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  if (data.action === "test-smtp-connection") {
    if (!getEnquiryNotificationTransport()) {
      return NextResponse.json({ error: "Configure SMTP settings before testing the connection." }, { status: 503 });
    }
    const userId = await getCmsUserId();
    if (!userId) return NextResponse.json({ error: "Sign in to test SMTP settings." }, { status: 401 });
    const rateLimit = await consumeCmsRateLimit("smtp-connection-test", userId, 3, 15 * 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many SMTP connection tests. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }
    try {
      await verifyEnquiryNotificationTransport();
    } catch (error) {
      console.error("SMTP connection verification failed.", error);
      await recordCmsAudit(userId, request, "notification.smtp_verify_failed", "notification", null, "SMTP connection verification failed.");
      return NextResponse.json({ error: "SMTP connection verification failed. Check the server logs and mail settings." }, { status: 502 });
    }
    await recordCmsAudit(userId, request, "notification.smtp_verify", "notification", null, "Verified the SMTP connection.");
    return NextResponse.json({ data: { verified: true } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
  if (data.action !== "retry-exhausted-notifications") {
    return NextResponse.json({ error: "Choose a valid operations action." }, { status: 400 });
  }
  if (!getEnquiryNotificationTransport()) {
    return NextResponse.json({ error: "Configure SMTP before retrying enquiry alerts." }, { status: 503 });
  }
  const retried = await retryExhaustedEnquiryNotifications();
  await recordCmsAudit(
    await getCmsUserId(), request, "notification.retry", "notification", null,
    `Requeued ${retried} exhausted enquiry notification${retried === 1 ? "" : "s"}.`,
  );
  return NextResponse.json({ data: { retried } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
