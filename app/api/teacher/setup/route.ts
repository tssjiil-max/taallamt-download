import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  createTeacherSession,
  setupTeacherPin,
  TEACHER_COOKIE,
  TeacherAuthError,
  teacherCookieOptions,
} from "@/lib/server/teacher-auth";

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
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "INVALID_PIN" }, { status: 400 });

  try {
    await setupTeacherPin(pin);
    const session = await createTeacherSession(pin);
    const response = NextResponse.json({ ok: true, expiresAtMs: session.expiresAtMs });
    response.cookies.set(TEACHER_COOKIE, session.cookieValue, teacherCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      const status = error.code === "ALREADY_CONFIGURED" ? 409 : error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 400;
      return NextResponse.json({ error: error.code }, { status });
    }
    console.error("teacher setup failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
