import { NextResponse } from "next/server";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  const database = getCmsDatabase();
  const rows = database.prepare("SELECT section_key, group_name, heading, eyebrow, body, image_url, position FROM cms_home_sections WHERE is_published = 1 AND group_name != 'site-copy' ORDER BY group_name, position, heading COLLATE NOCASE").all() as {
    section_key: string; group_name: string; heading: string; eyebrow: string;
    body: string; image_url: string; position: number;
  }[];
  const teamProfilesManaged = Boolean(database.prepare(`
    SELECT EXISTS (SELECT 1 FROM cms_home_sections WHERE group_name = 'team')
      OR EXISTS (SELECT 1 FROM cms_bootstrap_state WHERE key = 'homepage-defaults')
  `).get());
  const data = rows.reduce<Record<string, typeof rows>>((groups, item) => {
    (groups[item.group_name] ??= []).push(item);
    return groups;
  }, {});
  return NextResponse.json({ data, meta: { teamProfilesManaged } }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
