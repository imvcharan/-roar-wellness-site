import { createHmac, timingSafeEqual } from "node:crypto";
import { getCmsDatabase } from "@/lib/cms-db";

function getCaptchaSecret(): string | null {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

function signChallenge(challengeId: string, expiresAt: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${challengeId}.${expiresAt}`)
    .digest("base64url");
}

export function isAppointmentCaptchaConfigured(): boolean {
  return getCaptchaSecret() !== null;
}

export function createAppointmentCaptchaToken(challengeId: string, expiresAt: string): string | null {
  const secret = getCaptchaSecret();
  return secret ? signChallenge(challengeId, expiresAt, secret) : null;
}

export function consumeAppointmentCaptcha(token: unknown, answer: unknown): boolean {
  const secret = getCaptchaSecret();
  if (!secret || typeof token !== "string" || token.length > 256
    || typeof answer !== "string" || !/^\d{1,3}$/.test(answer)) return false;

  const [challengeId, tokenExpiry, suppliedSignature, extra] = token.split(".");
  if (!challengeId || !tokenExpiry || !suppliedSignature || extra || !/^\d+$/.test(tokenExpiry)) return false;

  const expectedSignature = Buffer.from(signChallenge(challengeId, tokenExpiry, secret));
  const actualSignature = Buffer.from(suppliedSignature);
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return false;

  const challenge = getCmsDatabase().prepare(
    "DELETE FROM appointment_captcha_challenges WHERE challenge_id = ? AND expires_at = ? AND expires_at > ? RETURNING answer",
  ).get(challengeId, Number(tokenExpiry), Math.floor(Date.now() / 1000)) as { answer: number } | undefined;
  return challenge?.answer === Number(answer);
}
