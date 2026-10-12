import { createHmac } from "node:crypto";
import { getCmsDatabase } from "@/lib/cms-db";

export function getCmsRateLimitKey(bucket: string, identifier: string): string {
  const secret = process.env.CMS_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("CMS_SESSION_SECRET must be configured to use CMS rate limiting.");
  return createHmac("sha256", secret).update(`${bucket}:${identifier}`).digest("hex");
}

export function consumeCmsRateLimit(
  bucket: string,
  identifier: string,
  maximum: number,
  windowSeconds: number,
): { allowed: boolean; hits: number; retryAfterSeconds: number } {
  const key = getCmsRateLimitKey(bucket, identifier);
  const now = Math.floor(Date.now() / 1000);
  const database = getCmsDatabase();
  database.prepare("DELETE FROM cms_rate_limits WHERE window_started_at <= ?").run(now - 86400);
  const result = database.prepare(`
    INSERT INTO cms_rate_limits (key, hits, window_started_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      hits = CASE WHEN cms_rate_limits.window_started_at <= ? THEN 1 ELSE cms_rate_limits.hits + 1 END,
      window_started_at = CASE WHEN cms_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE cms_rate_limits.window_started_at END
    RETURNING hits, window_started_at
  `).get(key, now, now - windowSeconds, now - windowSeconds);
  if (!result || typeof result.hits !== "number" || typeof result.window_started_at !== "number") {
    throw new Error("CMS rate-limit state could not be recorded.");
  }
  const row = { hits: result.hits, windowStartedAt: result.window_started_at };
  const retryAfterSeconds = Math.max(1, row.windowStartedAt + windowSeconds - now);
  return { allowed: row.hits <= maximum, hits: row.hits, retryAfterSeconds };
}

export function clearCmsRateLimit(bucket: string, identifier: string): void {
  getCmsDatabase().prepare("DELETE FROM cms_rate_limits WHERE key = ?")
    .run(getCmsRateLimitKey(bucket, identifier));
}
