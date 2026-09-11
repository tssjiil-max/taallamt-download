import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GuardianContact = {
  studentId: string;
  guardianName: string;
  guardianPhone: string;
};

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizePhone(value: unknown) {
  let digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (!digits) return "";
  if (digits.startsWith("00966")) digits = digits.slice(2);
  if (digits.startsWith("05") && digits.length === 10) digits = `966${digits.slice(1)}`;
  else if (digits.startsWith("5") && digits.length === 9) digits = `966${digits}`;
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

export async function GET() {
  try {
    await requireTeacher();
    const snap = await getAdminDb().collection(firestoreCollectionName("studentProfiles")).get();
    const contacts: GuardianContact[] = snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        studentId: doc.id,
        guardianName: typeof data.guardianName === "string" ? data.guardianName : "",
        guardianPhone: typeof data.guardianPhone === "string" ? data.guardianPhone : "",
      };
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher student contacts list failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as { studentId?: unknown; guardianName?: unknown; guardianPhone?: unknown; studentName?: unknown; className?: unknown } | null;
    const studentId = cleanText(body?.studentId, 200);
    const guardianName = cleanText(body?.guardianName, 120);
    const guardianPhone = normalizePhone(body?.guardianPhone);
    const studentName = cleanText(body?.studentName, 160);
    const className = cleanText(body?.className, 80);
    if (!studentId || guardianPhone === null) return NextResponse.json({ error: "INVALID_CONTACT" }, { status: 400 });

    const db = getAdminDb();
    const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
    const studentSnap = await studentRef.get();
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
    }

    await db.collection(firestoreCollectionName("studentProfiles")).doc(studentId).set({
      studentId,
      guardianName,
      guardianPhone,
      teacherContactUpdatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ ok: true, contact: { studentId, guardianName, guardianPhone } });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher student contact save failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
