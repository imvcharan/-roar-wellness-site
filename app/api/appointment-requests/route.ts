import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { consumeAppointmentCaptcha } from "@/lib/appointment-captcha";
import { parseAppointmentRequest } from "@/lib/appointment-validation";
import { getCmsDatabase, withCmsTransaction } from "@/lib/cms-db";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";
import { getCmsClientIp } from "@/lib/cms-client-ip";
import { enqueueEnquiryNotification } from "@/lib/cms-notifications";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, max-age=0" };

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 8192) {
    return NextResponse.json({ error: "The request is too large." }, { status: 413, headers: noStore });
  }
  const clientIp = getCmsClientIp(request);
  if (clientIp) {
    const ipRateLimit = await consumeCmsRateLimit("appointment-ip", clientIp, 5, 15 * 60);
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests were submitted from this connection. Please wait before trying again." },
        { status: 429, headers: { ...noStore, "Retry-After": String(ipRateLimit.retryAfterSeconds) } },
      );
    }
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
  if (!await consumeAppointmentCaptcha(data.token, data.answer)) {
    return NextResponse.json({ error: "The verification answer was incorrect or expired. Please try a new question." }, { status: 400, headers: noStore });
  }
  const rateLimit = await consumeCmsRateLimit("appointment-submit", data.email, 3, 15 * 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests were submitted from this email address. Please wait before trying again." },
      { status: 429, headers: { ...noStore, "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const database = getCmsDatabase();
  const id = randomUUID();
  let notificationConfigured = false;
  await withCmsTransaction(async () => {
    await database.prepare("INSERT INTO cms_enquiries (id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)")
      .run(id, data.name, data.email, data.phone, data.source);
    notificationConfigured = await enqueueEnquiryNotification(id);
  });
  return NextResponse.json({
    data: { received: true, emailAlertQueued: true, emailAlertConfigured: notificationConfigured },
  }, { status: 201, headers: noStore });
}
