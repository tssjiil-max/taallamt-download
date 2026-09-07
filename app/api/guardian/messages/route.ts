import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUARDIAN_COOKIE)?.value;

  try {
    const session = await readGuardianSession(cookieValue);
    const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
    const text = typeof body?.body === "string" ? body.body.trim() : "";

    if (!text || text.length > 1200) {
      return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
    }

    const id = randomUUID();
    const message = {
      id,
      studentId: session.studentId,
      author: "guardian" as const,
      body: text,
      createdAt: new Date().toISOString(),
    };

    await getAdminDb().collection(firestoreCollectionName("messages")).doc(id).set(message);
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian message failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
