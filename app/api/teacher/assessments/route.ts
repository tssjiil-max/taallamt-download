import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";
import type { MasteryLevel } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVELS = new Set<MasteryLevel>(["mastered", "partial", "needs_training"]);

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as {
      studentId?: unknown;
      skillId?: unknown;
      level?: unknown;
      note?: unknown;
    } | null;

    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const skillId = typeof body?.skillId === "string" ? body.skillId.trim() : "";
    const level = typeof body?.level === "string" ? body.level as MasteryLevel : null;
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";

    if (!studentId || !skillId || !level || !LEVELS.has(level)) {
      return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });
    }

    const db = getAdminDb();
    const [studentSnap, skillSnap] = await Promise.all([
      db.collection(firestoreCollectionName("students")).doc(studentId).get(),
      db.collection(firestoreCollectionName("skills")).doc(skillId).get(),
    ]);

    if (!studentSnap.exists || studentSnap.data()?.active !== true) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    if (!skillSnap.exists || skillSnap.data()?.active === false) {
      return NextResponse.json({ error: "SKILL_NOT_FOUND" }, { status: 404 });
    }

    const assessedAt = new Date().toISOString();
    const id = `assessment-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const assessment = {
      id,
      studentId,
      skillId,
      level,
      assessedAt,
      ...(note ? { note } : {}),
    };

    await db.collection(firestoreCollectionName("assessments")).doc(id).set(assessment);

    return NextResponse.json({ ok: true, assessment });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher assessment save failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
