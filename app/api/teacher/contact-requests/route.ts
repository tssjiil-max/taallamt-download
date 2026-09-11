import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactStatus = "pending" | "approved" | "rejected" | "closed";

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

export async function GET() {
  try {
    await requireTeacher();
    const db = getAdminDb();
    const [requestsSnap, studentsSnap] = await Promise.all([
      db.collection(firestoreCollectionName("contactRequests")).get(),
      db.collection(firestoreCollectionName("students")).get(),
    ]);
    const names = new Map(studentsSnap.docs.map((doc) => [doc.id, String(doc.data().name ?? "")]));
    const requests = requestsSnap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
          studentId: doc.id,
          studentName: names.get(doc.id) ?? "",
          status: String(data.status ?? "closed") as ContactStatus,
          reason: typeof data.reason === "string" ? data.reason : "",
          requestedAt: typeof data.requestedAt === "string" ? data.requestedAt : "",
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return NextResponse.json({ requests });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher contact requests list failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as { studentId?: unknown; status?: unknown } | null;
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const status = body?.status === "approved" || body?.status === "rejected" || body?.status === "closed" ? body.status : null;
    if (!studentId || !status) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });

    const now = new Date().toISOString();
    const ref = getAdminDb().collection(firestoreCollectionName("contactRequests")).doc(studentId);
    await ref.set({
      studentId,
      status,
      updatedAt: now,
      respondedAt: now,
    }, { merge: true });

    return NextResponse.json({ ok: true, studentId, status });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher contact request update failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
