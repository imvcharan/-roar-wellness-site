import { NextResponse } from "next/server";
import { cmsSessionCookieName, revokeCmsSession } from "@/lib/cms-auth";

export async function POST() {
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
