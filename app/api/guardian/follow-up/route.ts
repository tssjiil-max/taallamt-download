import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set(["health", "learning", "behavior", "family", "other"]);

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
    const body = (await request.json().catch(() => null)) as
      | { category?: unknown; statement?: unknown }
      | null;
    const category = typeof body?.category === "string" ? body.category : "";
    const statement = typeof body?.statement === "string" ? body.statement.trim() : "";

    if (!categories.has(category) || statement.length < 3 || statement.length > 1800) {
      return NextResponse.json({ error: "INVALID_FOLLOW_UP" }, { status: 400 });
    }

    const db = getAdminDb();
    const followRef = db.collection("followUps").doc(session.studentId);
    const studentRef = db.collection("students").doc(session.studentId);

    await db.runTransaction(async (transaction) => {
      const currentSnap = await transaction.get(followRef);
      const current = currentSnap.exists ? currentSnap.data() ?? {} : {};
      transaction.set(
        followRef,
        {
          ...current,
          studentId: session.studentId,
          category,
          guardianStatement: statement,
          guardianVisible: true,
          status: current.status ?? "needs_review",
          schoolImpact: current.schoolImpact ?? "",
          goal: current.goal ?? "",
          plan: Array.isArray(current.plan) ? current.plan : [],
          guardianUpdatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      transaction.set(studentRef, { specialFollowUp: true }, { merge: true });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian follow-up failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
