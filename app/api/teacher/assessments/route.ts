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

function clean(value: unknown, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as {
      studentId?: unknown;
      studentName?: unknown;
      className?: unknown;
      skillId?: unknown;
      level?: unknown;
      note?: unknown;
      skill?: {
        termId?: unknown;
        subjectId?: unknown;
        week?: unknown;
        category?: unknown;
        title?: unknown;
      };
    } | null;

    const studentId = clean(body?.studentId, 200);
    const studentName = clean(body?.studentName, 160);
    const className = clean(body?.className, 80);
    const skillId = clean(body?.skillId, 200);
    const level = typeof body?.level === "string" ? body.level as MasteryLevel : null;
    const note = clean(body?.note, 500);

    if (!studentId || !skillId || !level || !LEVELS.has(level)) {
      return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });
    }

    const db = getAdminDb();
    const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
    const skillRef = db.collection(firestoreCollectionName("skills")).doc(skillId);
    const [studentSnap, skillSnap] = await Promise.all([studentRef.get(), skillRef.get()]);

    if (!studentSnap.exists) {
      if (!studentName) return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
      await studentRef.set({
        id: studentId,
        name: studentName,
        className: className || "ثاني/4",
        active: true,
        guardianDeviceLimit: 2,
        guardianDevices: 0,
        specialFollowUp: false,
        subjectLevels: {},
        createdAt: new Date().toISOString(),
      }, { merge: true });
    } else if (studentSnap.data()?.active !== true) {
      return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    }

    if (!skillSnap.exists) {
      const skillMeta = body?.skill;
      const termId = clean(skillMeta?.termId, 120);
      const subjectId = clean(skillMeta?.subjectId, 120);
      const category = clean(skillMeta?.category, 120);
      const title = clean(skillMeta?.title, 400);
      const week = Number(skillMeta?.week);
      if (!termId || !subjectId || !category || !title || !Number.isFinite(week)) {
        return NextResponse.json({ error: "SKILL_NOT_FOUND" }, { status: 404 });
      }
      await skillRef.set({
        id: skillId,
        termId,
        subjectId,
        week,
        category,
        title,
        active: true,
        source: "teacher",
      }, { merge: true });
    } else if (skillSnap.data()?.active === false) {
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
