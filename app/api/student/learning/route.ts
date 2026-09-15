import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  getStudentLearningBundle,
  listActiveStudents,
  riyadhDateKey,
  toggleStudentTaskCompletion,
} from "@/lib/server/learning-automation";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Actor = { studentId: string; teacherPreview: boolean; previewStudents?: Array<{ id: string; name: string; className: string }> };

async function resolveActor(request: Request): Promise<Actor> {
  if (!isFirebaseAdminConfigured()) throw new Error("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  const guardianCookie = cookieStore.get(GUARDIAN_COOKIE)?.value;
  try {
    const session = await readGuardianSession(guardianCookie);
    return { studentId: session.studentId, teacherPreview: false };
  } catch (error) {
    if (!(error instanceof GuardianAuthError)) throw error;
  }

  const teacherCookie = cookieStore.get(TEACHER_COOKIE)?.value;
  await readTeacherSession(teacherCookie);
  const students = await listActiveStudents();
  if (!students.length) throw new Error("STUDENT_NOT_FOUND");
  const url = new URL(request.url);
  const requested = url.searchParams.get("studentId")?.trim();
  const selected = requested && students.some((student) => student.id === requested) ? requested : students[0].id;
  return { studentId: selected, teacherPreview: true, previewStudents: students };
}

function errorResponse(error: unknown) {
  if (error instanceof TeacherAuthError || error instanceof GuardianAuthError) {
    return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
  }
  const message = error instanceof Error ? error.message : "SERVER_ERROR";
  console.error("student learning automation failed", error);
  const status = /INVALID|NOT_FOUND|ONLY_TODAY|STUDENT_NOT_IN_CLASS/.test(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const actor = await resolveActor(request);
    const bundle = await getStudentLearningBundle(actor.studentId, riyadhDateKey());
    return NextResponse.json({
      ...bundle,
      mode: actor.teacherPreview ? "TEACHER_PREVIEW" : "STUDENT",
      ...(actor.previewStudents ? { previewStudents: actor.previewStudents } : {}),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await resolveActor(request);
    const body = (await request.json()) as Record<string, unknown>;
    const taskId = String(body.taskId ?? "");
    if (!taskId) return NextResponse.json({ error: "TASK_REQUIRED" }, { status: 400 });
    const result = await toggleStudentTaskCompletion(actor.studentId, taskId, riyadhDateKey());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error);
  }
}
