import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { teacherAuthConfigured } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebaseConfigured = isFirebaseAdminConfigured();
  let firebase = false;
  let teacherAuth = false;

  if (firebaseConfigured) {
    try {
      // A real Firestore read verifies the service-account credentials, project ID and network path.
      await getAdminDb().collection(firestoreCollectionName("system")).doc("health").get();
      firebase = true;
      teacherAuth = await teacherAuthConfigured();
    } catch (error) {
      console.error("backend status Firestore check failed", error);
    }
  }

  const guardianAuth = firebase;
  const teacherSetupRequired = firebase && !teacherAuth;

  return NextResponse.json(
    {
      ready: firebase && teacherAuth,
      firebaseConfigured,
      firebase,
      guardianAuth,
      teacherAuth,
      teacherSetupRequired,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
