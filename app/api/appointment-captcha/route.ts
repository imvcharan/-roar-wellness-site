import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { createAppointmentCaptchaToken, isAppointmentCaptchaConfigured } from "@/lib/appointment-captcha";
import { getCmsClientIp } from "@/lib/cms-client-ip";
import { consumeCmsRateLimit } from "@/lib/cms-rate-limit";

export const runtime = "nodejs";

const challengeLifetimeSeconds = 5 * 60;

function unavailable() {
  return NextResponse.json(
    { error: "The verification check is temporarily unavailable. Please contact us by phone or email." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  if (!isAppointmentCaptchaConfigured()) return unavailable();
  const clientIp = getCmsClientIp(request);
  if (clientIp) {
    const rateLimit = await consumeCmsRateLimit("appointment-captcha", clientIp, 10, 60);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please wait a moment and try again." },
        { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }
  }

  const left = randomInt(2, 13);
  const right = randomInt(2, 13);
  const challengeId = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + challengeLifetimeSeconds;
  const tokenExpiry = String(expiresAt);
  const signature = createAppointmentCaptchaToken(challengeId, tokenExpiry);
  if (!signature) return unavailable();
  const token = `${challengeId}.${tokenExpiry}.${signature}`;
  const database = getCmsDatabase();
  await database.prepare("INSERT INTO appointment_captcha_challenges (challenge_id, answer, expires_at) VALUES (?, ?, ?)")
    .run(challengeId, left + right, expiresAt);

  return NextResponse.json(
    { question: `What is ${left} + ${right}?`, token },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
