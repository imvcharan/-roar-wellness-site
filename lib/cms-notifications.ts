import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getCmsDatabase } from "@/lib/cms-db";
import { buildEnquiryNotification } from "@/lib/cms-notification-message";

export interface NotificationTransport {
  sendMail(message: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
}

let cachedTransport: Transporter | undefined;

export function getEnquiryNotificationTransport(): NotificationTransport | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.ENQUIRY_ALERT_FROM?.trim();
  const to = process.env.ENQUIRY_ALERT_TO?.trim();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || !to) return null;

  cachedTransport ??= nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return cachedTransport;
}

export function enqueueEnquiryNotification(enquiryId: string): boolean {
  if (!getEnquiryNotificationTransport()) return false;
  getCmsDatabase().prepare(
    "INSERT OR IGNORE INTO cms_notification_outbox (enquiry_id) VALUES (?)",
  ).run(enquiryId);
  return true;
}

export function retryExhaustedEnquiryNotifications(): number {
  const result = getCmsDatabase().prepare(`UPDATE cms_notification_outbox
    SET attempts = 0, next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
    WHERE sent_at IS NULL AND attempts >= 8`).run();
  return Number(result.changes);
}

export async function processPendingEnquiryNotifications(limit = 10): Promise<{ sent: number; failed: number; exhausted: number }> {
  const transport = getEnquiryNotificationTransport();
  if (!transport) throw new Error("SMTP notification settings are incomplete.");
  const database = getCmsDatabase();
  const rows = database.prepare(`SELECT o.enquiry_id, o.attempts, e.created_at
    FROM cms_notification_outbox o
    JOIN cms_enquiries e ON e.id = o.enquiry_id
    WHERE o.sent_at IS NULL AND o.attempts < 8
      AND o.next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    ORDER BY o.created_at ASC LIMIT ?`).all(limit) as {
      enquiry_id: string; attempts: number; created_at: string;
    }[];
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const claimed = database.prepare(`UPDATE cms_notification_outbox
      SET attempts = attempts + 1,
        next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 hour')
      WHERE enquiry_id = ? AND sent_at IS NULL AND attempts = ?
        AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
      .run(row.enquiry_id, row.attempts);
    if (claimed.changes !== 1) continue;
    try {
      const baseUrl = (process.env.CMS_PUBLIC_URL?.trim() || "https://www.roarwellness.org").replace(/\/+$/, "");
      await transport.sendMail(buildEnquiryNotification(
        row.created_at, baseUrl, process.env.ENQUIRY_ALERT_FROM!.trim(), process.env.ENQUIRY_ALERT_TO!.trim(),
      ));
      database.prepare(`UPDATE cms_notification_outbox
        SET sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
        WHERE enquiry_id = ?`).run(row.enquiry_id);
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
      database.prepare(`UPDATE cms_notification_outbox
        SET next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?),
          last_error = 'Delivery failed'
        WHERE enquiry_id = ?`).run(`+${retryMinutes} minutes`, row.enquiry_id);
      console.error("Unable to deliver an enquiry notification; it remains queued for retry.", error);
      failed += 1;
    }
  }
  const exhausted = (database.prepare(`SELECT COUNT(*) AS count FROM cms_notification_outbox
    WHERE sent_at IS NULL AND attempts >= 8`).get() as { count: number }).count;
  return { sent, failed, exhausted };
}
