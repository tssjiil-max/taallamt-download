import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { revokeTeacherSession, TEACHER_COOKIE } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(TEACHER_COOKIE)?.value;
  await revokeTeacherSession(cookieValue).catch((error) => console.error("teacher logout failed", error));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEACHER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
