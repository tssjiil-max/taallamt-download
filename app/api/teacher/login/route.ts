import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { createTeacherSession, TEACHER_COOKIE, TeacherAuthError, teacherCookieOptions } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin.trim() : "";
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "INVALID_PIN" }, { status: 400 });

  try {
    const session = await createTeacherSession(pin);
    const response = NextResponse.json({ ok: true, expiresAtMs: session.expiresAtMs });
    response.cookies.set(TEACHER_COOKIE, session.cookieValue, teacherCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher login failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
