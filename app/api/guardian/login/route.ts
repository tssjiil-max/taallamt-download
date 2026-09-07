import { NextResponse } from "next/server";
import {
  createGuardianSession,
  GUARDIAN_COOKIE,
  GuardianAuthError,
  guardianCookieOptions,
} from "@/lib/server/guardian-auth";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { clearLoginFailures, rateLimitBlocked, rateLimitKey, recordLoginFailure } from "@/lib/server/login-rate-limit";

export const runtime = "nodejs";

function errorStatus(code: GuardianAuthError["code"]) {
  if (code === "NOT_FOUND") return 404;
  if (code === "DEVICE_LIMIT") return 409;
  if (code === "BACKEND_NOT_CONFIGURED") return 503;
  if (code === "ACCESS_DISABLED") return 403;
  return 401;
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as
    | { studentId?: unknown; code?: unknown }
    | null;
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!studentId || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  const limitKey = rateLimitKey(request, "guardian", studentId);
  const limit = await rateLimitBlocked(limitKey);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "TOO_MANY_ATTEMPTS", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const session = await createGuardianSession(studentId, code);
    await clearLoginFailures(limitKey);
    const response = NextResponse.json({ ok: true, expiresAtMs: session.expiresAtMs });
    response.cookies.set(GUARDIAN_COOKIE, session.cookieValue, guardianCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof GuardianAuthError) {
      if (error.code === "INVALID_CODE") await recordLoginFailure(limitKey, 6);
      return NextResponse.json({ error: error.code }, { status: errorStatus(error.code) });
    }
    console.error("guardian login failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
