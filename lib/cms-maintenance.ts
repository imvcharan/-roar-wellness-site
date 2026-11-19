import { getCmsDatabase, withCmsTransaction } from "@/lib/cms-db";

export async function publishDueCmsContent(): Promise<number> {
  const result = await getCmsDatabase().prepare(`
    UPDATE content SET status = 'published', published_at = COALESCE(published_at, scheduled_publish_at),
      scheduled_publish_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL AND scheduled_publish_at <= ?
  `).run(new Date().toISOString());
  return result.changes;
}

export interface CmsMaintenanceSummary {
  enquiries: number;
  analyticsEvents: number;
  auditEvents: number;
  captchaChallenges: number;
  loginChallenges: number;
  sessions: number;
  rateLimits: number;
  pendingMfaSetups: number;
}

export async function runCmsMaintenance(): Promise<CmsMaintenanceSummary> {
  const database = getCmsDatabase();
  return withCmsTransaction(async () => {
    const enquiries = await database.prepare(
      "DELETE FROM cms_enquiries WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')",
    ).run();
    const analyticsEvents = await database.prepare(
      "DELETE FROM cms_analytics_events WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')",
    ).run();
    const auditEvents = await database.prepare(
      "DELETE FROM cms_audit_log WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-12 months')",
    ).run();
    const captchaChallenges = await database.prepare(
      "DELETE FROM appointment_captcha_challenges WHERE expires_at <= ?",
    ).run(Math.floor(Date.now() / 1000));
    const loginChallenges = await database.prepare(
      "DELETE FROM cms_login_challenges WHERE expires_at <= ?",
    ).run(Math.floor(Date.now() / 1000));
    const sessions = await database.prepare(
      "DELETE FROM cms_sessions WHERE expires_at <= ?",
    ).run(Math.floor(Date.now() / 1000));
    const rateLimits = await database.prepare(
      "DELETE FROM cms_rate_limits WHERE window_started_at <= ?",
    ).run(Math.floor(Date.now() / 1000) - 86400);
    const pendingMfaSetups = await database.prepare(
      "UPDATE cms_users SET totp_pending_secret_enc = NULL, totp_pending_at = NULL WHERE totp_pending_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-10 minutes')",
    ).run();
    return {
      enquiries: enquiries.changes,
      analyticsEvents: analyticsEvents.changes,
      auditEvents: auditEvents.changes,
      captchaChallenges: captchaChallenges.changes,
      loginChallenges: loginChallenges.changes,
      sessions: sessions.changes,
      rateLimits: rateLimits.changes,
      pendingMfaSetups: pendingMfaSetups.changes,
    };
  });
}
