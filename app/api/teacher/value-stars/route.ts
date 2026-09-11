import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      valueId?: unknown;
      valueTitle?: unknown;
      termId?: unknown;
      unitName?: unknown;
      studentText?: unknown;
      homeSuggestion?: unknown;
      weekFrom?: unknown;
      weekTo?: unknown;
      reason?: unknown;
    } | null;
    const studentId = clean(body?.studentId, 200);
    const studentName = clean(body?.studentName, 160);
    const className = clean(body?.className, 80);
    const valueId = clean(body?.valueId, 200);
    const valueTitle = clean(body?.valueTitle, 180);
    const termId = clean(body?.termId, 120);
    const unitName = clean(body?.unitName, 180);
    const studentText = clean(body?.studentText, 600);
    const homeSuggestion = clean(body?.homeSuggestion, 600);
    const reason = clean(body?.reason, 300);
    const weekFrom = Number(body?.weekFrom);
    const weekTo = Number(body?.weekTo);
    if (!studentId || !valueId) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });

    const db = getAdminDb();
    const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
    const valueRef = db.collection(firestoreCollectionName("values")).doc(valueId);
    const [studentSnap, valueSnap] = await Promise.all([studentRef.get(), valueRef.get()]);

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

    if (!valueSnap.exists) {
      if (!valueTitle) return NextResponse.json({ error: "VALUE_NOT_FOUND" }, { status: 404 });
      await valueRef.set({
        id: valueId,
        termId: termId || "term-1",
        unitName,
        title: valueTitle,
        studentText,
        homeSuggestion,
        weekFrom: Number.isFinite(weekFrom) && weekFrom > 0 ? weekFrom : 1,
        weekTo: Number.isFinite(weekTo) && weekTo > 0 ? weekTo : 17,
        active: true,
        source: "teacher",
      }, { merge: true });
    } else if (valueSnap.data()?.active === false) {
      return NextResponse.json({ error: "VALUE_NOT_FOUND" }, { status: 404 });
    }

    const id = `star-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const star = { id, studentId, valueId, awardedAt: new Date().toISOString(), ...(reason ? { reason } : {}) };
    await db.collection(firestoreCollectionName("valueStars")).doc(id).set(star);
    return NextResponse.json({ ok: true, star });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher value star save failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireTeacher();
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim() ?? "";
    const valueId = url.searchParams.get("valueId")?.trim() ?? "";
    if (!studentId || !valueId) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });

    const db = getAdminDb();
    const snap = await db.collection(firestoreCollectionName("valueStars"))
      .where("studentId", "==", studentId)
      .where("valueId", "==", valueId)
      .get();
    const latest = snap.docs.sort((a, b) => String(b.data().awardedAt ?? "").localeCompare(String(a.data().awardedAt ?? "")))[0];
    if (latest) await latest.ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher value star delete failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
