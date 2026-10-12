import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { consumeAppointmentCaptcha } from "@/lib/appointment-captcha";
import { getCmsDatabase } from "@/lib/cms-db";

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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Enter your contact details and try again." }, { status: 400, headers: noStore });
  }
  const data = body as Record<string, unknown>;
  if (typeof data.name !== "string" || !data.name.trim() || data.name.trim().length > 120
    || typeof data.email !== "string" || data.email.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
    || typeof data.phone !== "string" || !data.phone.trim() || data.phone.trim().length > 40
    || (data.source !== "appointment" && data.source !== "contact")
    || (typeof data.website === "string" && data.website.length > 0)
    || data.consent !== true) {
    return NextResponse.json({ error: "Check your name, email, phone number, and contact consent." }, { status: 400, headers: noStore });
  }
  if (!consumeAppointmentCaptcha(data.token, data.answer)) {
    return NextResponse.json({ error: "The verification answer was incorrect or expired. Please try a new question." }, { status: 400, headers: noStore });
  }

  const database = getCmsDatabase();
  const id = randomUUID();
  database.prepare("DELETE FROM cms_enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')").run();
  database.prepare("INSERT INTO cms_enquiries (id, name, email, phone, source) VALUES (?, ?, ?, ?, ?)")
    .run(id, data.name.trim(), data.email.trim().toLowerCase(), data.phone.trim(), data.source);
  return NextResponse.json({ data: { received: true } }, { status: 201, headers: noStore });
}
