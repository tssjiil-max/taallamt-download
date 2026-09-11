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
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    const now = new Date().toISOString();
    const ref = getAdminDb().collection(firestoreCollectionName("contactRequests")).doc(session.studentId);
    const current = await ref.get();
    const currentData = current.exists ? (current.data() as Record<string, unknown>) : undefined;

    if (currentData?.status === "approved") {
      return NextResponse.json({ ok: true, status: "approved" as const });
    }

    await ref.set({
      studentId: session.studentId,
      status: "pending",
      reason: reason || null,
      requestedAt: now,
      updatedAt: now,
      respondedAt: null,
    }, { merge: true });

    return NextResponse.json({ ok: true, status: "pending" as const }, { status: 201 });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian contact request failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
