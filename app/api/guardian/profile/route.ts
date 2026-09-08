import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GUARDIAN_COOKIE)?.value;
  try {
    const session = await readGuardianSession(cookieValue);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "INVALID_PROFILE" }, { status: 400 });

    const photoDataUrl = clean(body.photoDataUrl, 280000);
    if (photoDataUrl && !/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl)) {
      return NextResponse.json({ error: "INVALID_PHOTO" }, { status: 400 });
    }

    const profile = {
      studentId: session.studentId,
      preferredName: clean(body.preferredName, 80),
      interests: clean(body.interests, 500),
      strengths: clean(body.strengths, 500),
      learningDifficulties: clean(body.learningDifficulties, 1000),
      helpfulNotes: clean(body.helpfulNotes, 1000),
      photoDataUrl,
      guardianUpdatedAt: new Date().toISOString(),
    };

    await getAdminDb().collection(firestoreCollectionName("studentProfiles")).doc(session.studentId).set(profile, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof GuardianAuthError) return unauthorized();
    console.error("guardian profile failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
