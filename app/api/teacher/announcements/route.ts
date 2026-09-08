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

export async function GET() {
  try {
    await requireTeacher();
    const snap = await getAdminDb().collection(firestoreCollectionName("announcements")).get();
    const announcements = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return NextResponse.json({ announcements });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher announcements list failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => null)) as { title?: unknown; body?: unknown; eventDate?: unknown; kind?: unknown } | null;
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
    const text = typeof body?.body === "string" ? body.body.trim().slice(0, 1200) : "";
    const eventDate = typeof body?.eventDate === "string" ? body.eventDate.trim().slice(0, 30) : "";
    const kind = body?.kind === "reminder" || body?.kind === "event" ? body.kind : "general";
    if (!title || !text) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });
    const id = `announcement-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const announcement = { id, title, body: text, eventDate: eventDate || null, kind, audience: "guardians", active: true, createdAt: new Date().toISOString() };
    await getAdminDb().collection(firestoreCollectionName("announcements")).doc(id).set(announcement);
    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher announcement save failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireTeacher();
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!id) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });
    await getAdminDb().collection(firestoreCollectionName("announcements")).doc(id).set({ active: false, hiddenAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TeacherAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("teacher announcement hide failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
