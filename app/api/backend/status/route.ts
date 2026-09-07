import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = isFirebaseAdminConfigured();
  const guardianSecrets = Boolean(
    process.env.GUARDIAN_CODE_PEPPER &&
    (process.env.GUARDIAN_SESSION_PEPPER || process.env.GUARDIAN_CODE_PEPPER),
  );

  return NextResponse.json(
    {
      ready: firebase && guardianSecrets,
      firebase,
      guardianAuth: guardianSecrets,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
