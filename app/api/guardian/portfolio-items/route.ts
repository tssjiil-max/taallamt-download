import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DATA_URL = 700_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function unauthorized() {
  return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function sessionStudentId() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUARDIAN_COOKIE)?.value;
  return (await readGuardianSession(cookieValue)).studentId;
}

export async function GET() {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  try {
    const studentId = await sessionStudentId();
    const snap = await getAdminDb().collection(firestoreCollectionName("portfolioItems")).where("studentId", "==", studentId).get();
    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
      .slice(0, 30);
    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian portfolio list failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  try {
    const studentId = await sessionStudentId();
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_ITEM" }, { status: 400 });

    const title = clean(body.title, 80);
    const fileName = clean(body.fileName, 120);
    const mimeType = clean(body.mimeType, 80);
    const dataUrl = clean(body.dataUrl, MAX_DATA_URL + 1);
    if (!title || !fileName || !ALLOWED_MIME.has(mimeType) || !dataUrl || dataUrl.length > MAX_DATA_URL) {
      return NextResponse.json({ error: "INVALID_ITEM" }, { status: 400 });
    }
    const expectedPrefix = mimeType === "application/pdf" ? "data:application/pdf;base64," : `data:${mimeType};base64,`;
    if (!dataUrl.startsWith(expectedPrefix)) return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });

    const ref = getAdminDb().collection(firestoreCollectionName("portfolioItems")).doc();
    const item = {
      studentId,
      title,
      fileName,
      mimeType,
      dataUrl,
      source: "guardian",
      createdAt: new Date().toISOString(),
    };
    await ref.set(item);
    return NextResponse.json({ ok: true, item: { id: ref.id, ...item } });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian portfolio upload failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  try {
    const studentId = await sessionStudentId();
    const id = clean(new URL(request.url).searchParams.get("id"), 120);
    if (!id) return NextResponse.json({ error: "INVALID_ITEM" }, { status: 400 });
    const ref = getAdminDb().collection(firestoreCollectionName("portfolioItems")).doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.studentId !== studentId) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian portfolio delete failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
