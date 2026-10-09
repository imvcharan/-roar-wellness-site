import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

const challengeLifetimeSeconds = 5 * 60;

function getCaptchaSecret() {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function signChallenge(challengeId: string, expiresAt: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${challengeId}.${expiresAt}`)
    .digest("base64url");
}

function unavailable() {
  return NextResponse.json(
    { error: "The verification check is temporarily unavailable. Please contact us by phone or email." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const secret = getCaptchaSecret();
  if (!secret) return unavailable();

  const left = randomInt(2, 13);
  const right = randomInt(2, 13);
  const challengeId = randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + challengeLifetimeSeconds;
  const tokenExpiry = String(expiresAt);
  const token = `${challengeId}.${tokenExpiry}.${signChallenge(challengeId, tokenExpiry, secret)}`;
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

export async function POST(request: Request) {
  const secret = getCaptchaSecret();
  if (!secret) return unavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the answer to the math question." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Enter the answer to the math question." }, { status: 400 });
  }

  const { token, answer } = body as { token?: unknown; answer?: unknown };
  if (typeof token !== "string" || token.length > 256 || typeof answer !== "string" || !/^\d{1,3}$/.test(answer)) {
    return NextResponse.json({ error: "Enter the answer to the math question." }, { status: 400 });
  }

  const [challengeId, tokenExpiry, suppliedSignature, extra] = token.split(".");
  if (!challengeId || !tokenExpiry || !suppliedSignature || extra || !/^\d+$/.test(tokenExpiry)) {
    return NextResponse.json({ error: "The verification question expired. Please try the new question." }, { status: 400 });
  }

  const expectedSignature = Buffer.from(signChallenge(challengeId, tokenExpiry, secret));
  const actualSignature = Buffer.from(suppliedSignature);
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    return NextResponse.json({ error: "The verification question expired. Please try the new question." }, { status: 400 });
  }

  const database = getCmsDatabase();
  const challenge = database.prepare(
    "DELETE FROM appointment_captcha_challenges WHERE challenge_id = ? AND expires_at = ? AND expires_at > ? RETURNING answer",
  ).get(challengeId, Number(tokenExpiry), Math.floor(Date.now() / 1000)) as { answer: number } | undefined;

  if (!challenge || challenge.answer !== Number(answer)) {
    return NextResponse.json(
      { error: "That answer wasn’t correct. A new question has been loaded." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json({ verified: true }, { headers: { "Cache-Control": "no-store" } });
}
