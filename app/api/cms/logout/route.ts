import { NextResponse } from "next/server";
import { cmsSessionCookieName, getCmsUserId, revokeCmsSession } from "@/lib/cms-auth";
import { recordCmsAudit } from "@/lib/cms-audit";

export async function POST(request: Request) {
  const userId = await getCmsUserId();
  if (userId) recordCmsAudit(userId, request, "auth.logout", "session", null, "Signed out of the CMS.");
  await revokeCmsSession();
  const response = NextResponse.json({ data: { authenticated: false } });
  response.cookies.set(cmsSessionCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
