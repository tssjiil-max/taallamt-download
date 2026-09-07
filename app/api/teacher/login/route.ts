import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { clearLoginFailures, rateLimitBlocked, rateLimitKey, recordLoginFailure } from "@/lib/server/login-rate-limit";
import { createTeacherSession, TEACHER_COOKIE, TeacherAuthError, teacherCookieOptions } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";

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

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "INVALID_PIN" }, { status: 400 });

  const limitKey = rateLimitKey(request, "teacher");
  const limit = await rateLimitBlocked(limitKey);
  if (limit.blocked) {
    return NextResponse.json(
      { error: "TOO_MANY_ATTEMPTS", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const session = await createTeacherSession(pin);
    await clearLoginFailures(limitKey);
    const response = NextResponse.json({ ok: true, expiresAtMs: session.expiresAtMs });
    response.cookies.set(TEACHER_COOKIE, session.cookieValue, teacherCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      if (error.code === "INVALID_PIN") await recordLoginFailure(limitKey, 5);
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher login failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
