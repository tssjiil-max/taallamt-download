import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, revokeGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUARDIAN_COOKIE)?.value;

  if (isFirebaseAdminConfigured()) {
    await revokeGuardianSession(cookieValue).catch((error) => {
      console.error("guardian logout failed", error);
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GUARDIAN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
