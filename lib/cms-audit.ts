import { randomUUID } from "node:crypto";
import { getCmsDatabase } from "@/lib/cms-db";

export function recordCmsAudit(
  userId: string | null,
  request: Request,
  action: string,
  resourceType: string,
  resourceId: string | null,
  summary: string,
): void {
  try {
    const database = getCmsDatabase();
    const user = userId
      ? database.prepare("SELECT name FROM cms_users WHERE id = ?").get(userId) as { name: string } | undefined
      : undefined;
    const trustedGeo = process.env.CMS_TRUSTED_GEO_PROVIDER?.trim().toLowerCase();
    const location = trustedGeo === "vercel"
      ? [request.headers.get("x-vercel-ip-city"), request.headers.get("x-vercel-ip-country")]
      : trustedGeo === "cloudflare"
        ? [request.headers.get("cf-ipcity"), request.headers.get("cf-ipcountry")]
        : [];
    const normalizedLocation = location
      .map((value) => value?.replace(/[\r\n]/g, " ").trim().slice(0, 80))
      .filter((value): value is string => Boolean(value));

    database.prepare(`
      INSERT INTO cms_audit_log (id, user_id, actor_name, action, resource_type, resource_id, summary, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      userId,
      user?.name ?? "Unknown account",
      action.slice(0, 80),
      resourceType.slice(0, 80),
      resourceId?.slice(0, 160) ?? null,
      summary.replace(/[\r\n]/g, " ").slice(0, 300),
      normalizedLocation.length ? normalizedLocation.join(", ") : null,
    );
  } catch (error) {
    console.error("Unable to write CMS audit event.", error);
  }
}
