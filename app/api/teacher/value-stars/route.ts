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

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as { studentId?: unknown; valueId?: unknown; reason?: unknown } | null;
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const valueId = typeof body?.valueId === "string" ? body.valueId.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
    if (!studentId || !valueId) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });

    const db = getAdminDb();
    const [studentSnap, valueSnap] = await Promise.all([
      db.collection(firestoreCollectionName("students")).doc(studentId).get(),
      db.collection(firestoreCollectionName("values")).doc(valueId).get(),
    ]);
    if (!studentSnap.exists || studentSnap.data()?.active !== true) return NextResponse.json({ error: "STUDENT_NOT_FOUND" }, { status: 404 });
    if (!valueSnap.exists || valueSnap.data()?.active === false) return NextResponse.json({ error: "VALUE_NOT_FOUND" }, { status: 404 });

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
