import { NextResponse } from "next/server";
import { authSecretConfigured } from "@/lib/server/auth-secret";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { teacherAuthConfigured } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebaseConfigured = isFirebaseAdminConfigured();
  const authSecret = authSecretConfigured();
  let firebase = false;
  let teacherAuth = false;

  if (firebaseConfigured) {
    try {
      // A real Firestore read verifies service-account credentials, project ID and network access.
      await getAdminDb().collection(firestoreCollectionName("system")).doc("health").get();
      firebase = true;
      if (authSecret) teacherAuth = await teacherAuthConfigured();
    } catch (error) {
      console.error("backend status Firestore check failed", error);
    }
  }

  const guardianAuth = firebase && authSecret;
  const teacherSetupRequired = firebase && authSecret && !teacherAuth;

  return NextResponse.json(
    {
      ready: firebase && authSecret && teacherAuth,
      firebaseConfigured,
      firebase,
      authSecret,
      guardianAuth,
      teacherAuth,
      teacherSetupRequired,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
