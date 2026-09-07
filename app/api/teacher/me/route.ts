import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(TEACHER_COOKIE)?.value;
  try {
    const session = await readTeacherSession(cookieValue);
    return NextResponse.json({ authenticated: true, expiresAtMs: session.expiresAtMs });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ authenticated: false, error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher me failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
