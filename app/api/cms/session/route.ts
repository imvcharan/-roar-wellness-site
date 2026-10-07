import { NextResponse } from "next/server";
import { getCmsRole, getCmsUserId } from "@/lib/cms-auth";
import { getCmsDatabase } from "@/lib/cms-db";

export const runtime = "nodejs";

export async function GET() {
  const role = await getCmsRole();
  const id = await getCmsUserId();
  if (!role || !id) return NextResponse.json({ error: "Sign in to the CMS." }, { status: 401 });
  const user = getCmsDatabase().prepare("SELECT id, email, name, role FROM cms_users WHERE id = ?").get(id);
  return NextResponse.json({ data: user });
}
