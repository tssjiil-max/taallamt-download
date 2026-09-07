import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  GUARDIAN_COOKIE,
  GuardianAuthError,
  readGuardianSession,
} from "@/lib/server/guardian-auth";
import { loadGuardianBundle } from "@/lib/server/guardian-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  const response = NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
  response.cookies.set(GUARDIAN_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUARDIAN_COOKIE)?.value;

  try {
    const session = await readGuardianSession(cookieValue);
    const bundle = await loadGuardianBundle(session.studentId);
    if (!bundle) return unauthorized();
    return NextResponse.json({ ...bundle, session: { expiresAtMs: session.expiresAtMs } });
  } catch (error) {
    if (error instanceof GuardianAuthError) {
      if (error.code === "BACKEND_NOT_CONFIGURED") {
        return NextResponse.json({ error: error.code }, { status: 503 });
      }
      return unauthorized();
    }
    console.error("guardian me failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
