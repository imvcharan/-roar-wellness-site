import { NextResponse } from "next/server";
import { getCmsDatabase, getCmsSettings } from "@/lib/cms-db";
import { isCmsAdmin } from "@/lib/cms-auth";

export const runtime = "nodejs";

const editableKeys = new Set([
  "siteName", "siteDescription", "siteUrl", "seoTitle", "seoDescription",
  "homepageHeroTitle", "homepageHeroEyebrow", "homepageHeroDescription",
  "homepageApproachTitle", "homepageApproachEyebrow", "homepageApproachDescription",
  "contactEmail", "contactPhone", "contactWhatsApp", "contactAddress", "postsPerPage",
]);

export async function GET() {
  return NextResponse.json({ data: getCmsSettings() }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PUT(request: Request) {
  if (!await isCmsAdmin()) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "A settings object is required." }, { status: 400 });
  const values = body as Record<string, unknown>;
  const database = getCmsDatabase();
  const update = database.prepare("INSERT INTO cms_settings (key, value, updated_at) VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at");
  const updateSection = database.prepare("UPDATE cms_home_sections SET heading = ?, eyebrow = ?, body = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE section_key = ?");

  for (const [key, value] of Object.entries(values)) {
    if (!editableKeys.has(key)) return NextResponse.json({ error: `Setting “${key}” cannot be edited.` }, { status: 400 });
    if (typeof value !== "string" || value.length > (key.endsWith("Description") ? 5000 : 300)) {
      return NextResponse.json({ error: `Setting “${key}” has an invalid value or is too long.` }, { status: 400 });
    }
    if (["siteUrl"].includes(key)) {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      } catch {
        return NextResponse.json({ error: "Site URL must be a valid HTTP or HTTPS URL." }, { status: 400 });
      }
    }
    if (key === "postsPerPage" && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100)) {
      return NextResponse.json({ error: "Items per page must be between 1 and 100." }, { status: 400 });
    }
  }

  const pairs = Object.entries(values);
  database.exec("BEGIN IMMEDIATE");
  try {
    pairs.forEach(([key, value]) => update.run(key, value as string));
    updateSection.run(
      String(values.homepageHeroTitle ?? getCmsSettings().homepageHeroTitle ?? "Roar Wellness"),
      String(values.homepageHeroEyebrow ?? getCmsSettings().homepageHeroEyebrow ?? "Rehabilitation centre · Delhi"),
      String(values.homepageHeroDescription ?? getCmsSettings().homepageHeroDescription ?? ""),
      "hero",
    );
    updateSection.run(
      String(values.homepageApproachTitle ?? getCmsSettings().homepageApproachTitle ?? "Our Approach"),
      String(values.homepageApproachEyebrow ?? getCmsSettings().homepageApproachEyebrow ?? "Approach"),
      String(values.homepageApproachDescription ?? getCmsSettings().homepageApproachDescription ?? ""),
      "approach",
    );
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return NextResponse.json({ data: getCmsSettings() });
}
