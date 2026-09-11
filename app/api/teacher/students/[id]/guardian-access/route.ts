import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { createGuardianShareToken, hashGuardianAccessCode } from "@/lib/server/guardian-auth";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireTeacher();
    const { id } = await context.params;
    const studentId = id.trim();
    const db = getAdminDb();
    const snap = await db.collection(firestoreCollectionName("students")).doc(studentId).get();
    if (!snap.exists) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const data = snap.data() ?? {};
    const enabled = data.guardianAccessEnabled === true && typeof data.guardianAccessCodeHash === "string" && data.guardianAccessCodeHash.length > 0;
    return NextResponse.json({
      ok: true,
      enabled,
      shareToken: enabled ? createGuardianShareToken(studentId, data.guardianAccessCodeHash) : null,
    });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher guardian access read failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireTeacher();
    const { id } = await context.params;
    const studentId = id.trim();
    const body = (await request.json().catch(() => null)) as { code?: unknown; studentName?: unknown; className?: unknown } | null;
    const code = clean(body?.code, 20);
    const studentName = clean(body?.studentName, 160);
    const className = clean(body?.className, 80);
    if (!studentId || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection(firestoreCollectionName("students")).doc(studentId);
    let snap = await ref.get();
    if (!snap.exists) {
      if (!studentName) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      await ref.set({
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
      snap = await ref.get();
    }

    const accessHash = hashGuardianAccessCode(studentId, code);
    await ref.set(
      {
        guardianAccessEnabled: true,
        guardianAccessCodeHash: accessHash,
        guardianCodeUpdatedAt: new Date().toISOString(),
        guardianDeviceLimit: 2,
        guardianSearchName: String(snap.data()?.name ?? studentName)
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

    return NextResponse.json({ ok: true, shareToken: createGuardianShareToken(studentId, accessHash) });
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
