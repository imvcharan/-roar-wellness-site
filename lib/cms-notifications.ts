import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getCmsDatabase } from "@/lib/cms-db";
import { buildEnquiryNotification } from "@/lib/cms-notification-message";

export interface NotificationTransport {
  sendMail(message: { from: string; to: string; subject: string; text: string }): Promise<unknown>;
  verify(): Promise<boolean>;
}

let cachedTransport: Transporter | undefined;

function getEnquiryAlertFrom(): string | null {
  return process.env.ENQUIRY_ALERT_FROM?.trim() || process.env.SMTP_USER?.trim() || null;
}

export function getEnquiryNotificationTransport(): NotificationTransport | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from = getEnquiryAlertFrom();
  const to = process.env.ENQUIRY_ALERT_TO?.trim() || "help@roarwellness.org";
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from) return null;

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

export async function verifyEnquiryNotificationTransport(): Promise<void> {
  const transport = getEnquiryNotificationTransport();
  if (!transport) throw new Error("SMTP notification settings are incomplete.");
  if (!await transport.verify()) throw new Error("SMTP connection verification failed.");
}

export async function enqueueEnquiryNotification(enquiryId: string): Promise<boolean> {
  const configured = Boolean(getEnquiryNotificationTransport());
  await getCmsDatabase().prepare(
    "INSERT OR IGNORE INTO cms_notification_outbox (enquiry_id) VALUES (?)",
  ).run(enquiryId);
  return configured;
}

export async function retryExhaustedEnquiryNotifications(): Promise<number> {
  const result = await getCmsDatabase().prepare(`UPDATE cms_notification_outbox
    SET attempts = 0, next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
    WHERE sent_at IS NULL AND attempts >= 8`).run();
  return Number(result.changes);
}

export async function processPendingEnquiryNotifications(limit = 10): Promise<{ sent: number; failed: number; exhausted: number }> {
  const transport = getEnquiryNotificationTransport();
  const from = getEnquiryAlertFrom();
  if (!transport || !from) throw new Error("SMTP notification settings are incomplete.");
  const database = getCmsDatabase();
  const rows = await database.prepare(`SELECT o.enquiry_id, o.attempts, e.created_at
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
    const claimed = await database.prepare(`UPDATE cms_notification_outbox
      SET attempts = attempts + 1,
        next_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+1 hour')
      WHERE enquiry_id = ? AND sent_at IS NULL AND attempts = ?
        AND next_attempt_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`)
      .run(row.enquiry_id, row.attempts);
    if (claimed.changes !== 1) continue;
    try {
      const baseUrl = (process.env.CMS_PUBLIC_URL?.trim() || "https://www.roarwellness.org").replace(/\/+$/, "");
      await transport.sendMail(buildEnquiryNotification(
        row.created_at, baseUrl, from,
        process.env.ENQUIRY_ALERT_TO?.trim() || "help@roarwellness.org",
      ));
      await database.prepare(`UPDATE cms_notification_outbox
        SET sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), last_error = NULL
        WHERE enquiry_id = ?`).run(row.enquiry_id);
      sent += 1;
    } catch (error) {
      const attempts = row.attempts + 1;
      const retryMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
      await database.prepare(`UPDATE cms_notification_outbox
        SET next_attempt_at = to_char((clock_timestamp() + (?::text || ' minutes')::interval) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          last_error = 'Delivery failed'
        WHERE enquiry_id = ?`).run(`+${retryMinutes} minutes`, row.enquiry_id);
      console.error("Unable to deliver an enquiry notification; it remains queued for retry.", error);
      failed += 1;
    }
  }
  const exhausted = (await database.prepare(`SELECT COUNT(*) AS count FROM cms_notification_outbox
    WHERE sent_at IS NULL AND attempts >= 8`).get() as { count: number }).count;
  return { sent, failed, exhausted };
}
