import { NextResponse } from "next/server";
import { getCmsRole } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";
import { listCmsContentRevisions } from "@/lib/cms-content-revisions";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getCmsRole()) return NextResponse.json({ error: "Sign in to view content history." }, { status: 401 });
  const { id } = await params;
  const data = await listCmsContentRevisions(getCmsDatabase(), id);
  return NextResponse.json({ data });
}
