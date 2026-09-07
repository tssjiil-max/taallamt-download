import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { hashGuardianAccessCode } from "@/lib/server/guardian-auth";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireTeacher();
    const { id } = await context.params;
    const studentId = id.trim();
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!studentId || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection(firestoreCollectionName("students")).doc(studentId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await ref.set(
      {
        guardianAccessEnabled: true,
        guardianAccessCodeHash: hashGuardianAccessCode(studentId, code),
        guardianCodeUpdatedAt: new Date().toISOString(),
        guardianDeviceLimit: 2,
        guardianSearchName: String(snap.data()?.name ?? "")
          .normalize("NFKC")
          .replace(/[\u064B-\u065F\u0670]/g, "")
          .replace(/[إأآٱ]/g, "ا")
          .replace(/ى/g, "ي")
          .replace(/ؤ/g, "و")
          .replace(/ئ/g, "ي")
          .replace(/ة/g, "ه")
          .replace(/\s+/g, " ")
          .trim(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher guardian access update failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireTeacher();
    const { id } = await context.params;
    const studentId = id.trim();
    const db = getAdminDb();
    const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
    const snap = await studentRef.get();
    if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const slots = Array.isArray(snap.data()?.guardianSessionSlots) ? snap.data()?.guardianSessionSlots : [];
    const batch = db.batch();
    for (const slot of slots) {
      if (slot && typeof slot.id === "string") {
        batch.set(db.collection(firestoreCollectionName("guardianSessions")).doc(slot.id), { revokedAtMs: Date.now() }, { merge: true });
      }
    }
    batch.set(
      studentRef,
      {
        guardianAccessEnabled: false,
        guardianAccessCodeHash: null,
        guardianCodeUpdatedAt: new Date().toISOString(),
        guardianSessionSlots: [],
        guardianDevices: 0,
      },
      { merge: true },
    );
    await batch.commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher guardian access disable failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
