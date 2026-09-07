import { NextResponse } from "next/server";
import {
  createGuardianSession,
  GUARDIAN_COOKIE,
  GuardianAuthError,
  guardianCookieOptions,
} from "@/lib/server/guardian-auth";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";

function errorStatus(code: GuardianAuthError["code"]) {
  if (code === "NOT_FOUND") return 404;
  if (code === "DEVICE_LIMIT") return 409;
  if (code === "BACKEND_NOT_CONFIGURED") return 503;
  if (code === "ACCESS_DISABLED") return 403;
  return 401;
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as
    | { studentId?: unknown; code?: unknown }
    | null;
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!studentId || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  try {
    const session = await createGuardianSession(studentId, code);
    const response = NextResponse.json({ ok: true, expiresAtMs: session.expiresAtMs });
    response.cookies.set(GUARDIAN_COOKIE, session.cookieValue, guardianCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof GuardianAuthError) {
      return NextResponse.json({ error: error.code }, { status: errorStatus(error.code) });
    }
    console.error("guardian login failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
