import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { consumeAppointmentCaptcha } from "@/lib/appointment-captcha";
import { parseAppointmentRequest } from "@/lib/appointment-validation";
import { getCmsDatabase } from "@/lib/cms-db";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";
import { enqueueEnquiryNotification, processPendingEnquiryNotifications } from "@/lib/cms-notifications";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8192) {
    return NextResponse.json({ error: "The request is too large." }, { status: 413, headers: noStore });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter your contact details and try again." }, { status: 400, headers: noStore });
  }
  const data = parseAppointmentRequest(body);
  if (!data) {
    return NextResponse.json({ error: "Check your name, email, phone number, and contact consent." }, { status: 400, headers: noStore });
  }
  if (!consumeAppointmentCaptcha(data.token, data.answer)) {
    return NextResponse.json({ error: "The verification answer was incorrect or expired. Please try a new question." }, { status: 400, headers: noStore });
  }
  const rateLimit = consumeCmsRateLimit("appointment-submit", data.email, 3, 15 * 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests were submitted from this email address. Please wait before trying again." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const database = getCmsDatabase();
  const id = randomUUID();
  let notificationQueued = false;
  try {
    database.exec("BEGIN IMMEDIATE");
    database.prepare("DELETE FROM cms_enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
    database.prepare("INSERT INTO cms_enquiries (id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)")
      .run(id, data.name, data.email, data.phone, data.source);
    notificationQueued = enqueueEnquiryNotification(id);
    database.exec("COMMIT");
  } catch (error) {
    if (database.isTransaction) database.exec("ROLLBACK");
    throw error;
  }
  if (notificationQueued) {
    try {
      await processPendingEnquiryNotifications(1);
    } catch (error) {
      console.error("Enquiry was saved, but notification delivery could not start; it remains queued for retry.", error);
    }
  } else {
    console.warn("Enquiry notification is not configured; administrators will need to monitor the CMS inbox.");
  }
  return NextResponse.json({ data: { received: true } }, { status: 201, headers: noStore });
}
