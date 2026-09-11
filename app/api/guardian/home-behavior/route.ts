import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedBehaviors = new Set([
  "الالتزام بالتعليمات",
  "احترام الآخرين",
  "تحمل المسؤولية",
  "النظافة والترتيب",
  "الصدق والأمانة",
]);
const allowedLevels = new Set(["متميز ⭐", "جيد ✓", "يحتاج متابعة !"]);

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }
  const cookieStore = await cookies();
  try {
    const session = await readGuardianSession(cookieStore.get(GUARDIAN_COOKIE)?.value);
    const body = (await request.json().catch(() => null)) as { behavior?: unknown; level?: unknown } | null;
    const behavior = typeof body?.behavior === "string" ? body.behavior.trim() : "";
    const level = typeof body?.level === "string" ? body.level.trim() : "";
    if (!allowedBehaviors.has(behavior) || !allowedLevels.has(level)) {
      return NextResponse.json({ error: "INVALID_BEHAVIOR" }, { status: 400 });
    }

    const id = randomUUID();
    const message = {
      id,
      studentId: session.studentId,
      author: "guardian" as const,
      body: `تقييم المنزل: ${behavior} — ${level}`,
      createdAt: new Date().toISOString(),
      kind: "home_behavior" as const,
    };
    await getAdminDb().collection(firestoreCollectionName("messages")).doc(id).set(message);
    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    if (error instanceof GuardianAuthError) return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
    console.error("guardian home behavior failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
