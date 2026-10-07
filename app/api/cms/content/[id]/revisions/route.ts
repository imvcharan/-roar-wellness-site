import { NextResponse } from "next/server";
import { getCmsRole } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getCmsRole()) return NextResponse.json({ error: "Sign in to view content history." }, { status: 401 });
  const { id } = await params;
  const data = getCmsDatabase().prepare(`
    SELECT r.id, r.content_id, r.created_at, u.name AS created_by,
      json_extract(r.snapshot, '$.title') AS title,
      json_extract(r.snapshot, '$.status') AS status
    FROM cms_revisions r LEFT JOIN cms_users u ON u.id = r.created_by
    WHERE r.content_id = ? ORDER BY r.created_at DESC
  `).all(id);
  return NextResponse.json({ data });
}
