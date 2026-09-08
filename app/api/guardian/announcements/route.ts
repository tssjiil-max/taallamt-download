import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { GUARDIAN_COOKIE, GuardianAuthError, readGuardianSession } from "@/lib/server/guardian-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnnouncementDoc = { id: string } & Record<string, unknown>;

export async function GET() {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  try {
    const cookieStore = await cookies();
    await readGuardianSession(cookieStore.get(GUARDIAN_COOKIE)?.value);
    const snap = await getAdminDb().collection(firestoreCollectionName("announcements")).where("active", "==", true).get();
    const announcements = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as AnnouncementDoc))
      .filter((item) => item.audience === "guardians" || item.audience === "all")
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
      .slice(0, 30);
    return NextResponse.json({ announcements });
  } catch (error) {
    if (error instanceof GuardianAuthError) return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    console.error("guardian announcements failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
