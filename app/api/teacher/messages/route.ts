import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MessageDoc = {
  id: string;
  studentId?: unknown;
  author?: unknown;
  body?: unknown;
  createdAt?: unknown;
} & Record<string, unknown>;

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

export async function GET(request: Request) {
  try {
    await requireTeacher();
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim() ?? "";
    const collection = getAdminDb().collection(firestoreCollectionName("messages"));
    const snap = studentId ? await collection.where("studentId", "==", studentId).get() : await collection.get();
    const messages = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as MessageDoc))
      .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
      .slice(-200);
    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher messages list failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as { studentId?: unknown; body?: unknown } | null;
    const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
    const text = typeof body?.body === "string" ? body.body.trim() : "";
    if (!studentId || !text || text.length > 1200) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });

    const accessSnap = await getAdminDb().collection(firestoreCollectionName("contactRequests")).doc(studentId).get();
    const access = accessSnap.exists ? (accessSnap.data() as Record<string, unknown>) : undefined;
    if (access?.status !== "approved") return NextResponse.json({ error: "CONTACT_NOT_APPROVED" }, { status: 403 });

    const id = randomUUID();
    const message = {
      id,
      studentId,
      author: "teacher" as const,
      body: text,
      createdAt: new Date().toISOString(),
    };
    await getAdminDb().collection(firestoreCollectionName("messages")).doc(id).set(message);
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher message save failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
