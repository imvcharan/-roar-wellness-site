import { randomInt, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";
import { createAppointmentCaptchaToken, isAppointmentCaptchaConfigured } from "@/lib/appointment-captcha";

export const runtime = "nodejs";

const challengeLifetimeSeconds = 5 * 60;

function unavailable() {
  return NextResponse.json(
    { error: "The verification check is temporarily unavailable. Please contact us by phone or email." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  if (!isAppointmentCaptchaConfigured()) return unavailable();

  const left = randomInt(2, 13);
  const right = randomInt(2, 13);
  const challengeId = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + challengeLifetimeSeconds;
  const tokenExpiry = String(expiresAt);
  const signature = createAppointmentCaptchaToken(challengeId, tokenExpiry);
  if (!signature) return unavailable();
  const token = `${challengeId}.${tokenExpiry}.${signature}`;
  const database = getCmsDatabase();

  database.prepare("DELETE FROM appointment_captcha_challenges WHERE expires_at <= ?")
    .run(Math.floor(Date.now() / 1000));
  database.prepare("INSERT INTO appointment_captcha_challenges (challenge_id, answer, expires_at) VALUES (?, ?, ?)")
    .run(challengeId, left + right, expiresAt);

  return NextResponse.json(
    { question: `What is ${left} + ${right}?`, token },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
