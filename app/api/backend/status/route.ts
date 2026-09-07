import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = isFirebaseAdminConfigured();
  const guardianAuth = Boolean(
    process.env.GUARDIAN_CODE_PEPPER &&
    (process.env.GUARDIAN_SESSION_PEPPER || process.env.GUARDIAN_CODE_PEPPER),
  );
  const teacherAuth = Boolean(
    process.env.TEACHER_ACCESS_PIN_HASH &&
    process.env.TEACHER_SESSION_PEPPER,
  );

  return NextResponse.json(
    {
      ready: firebase && guardianAuth && teacherAuth,
      firebase,
      guardianAuth,
      teacherAuth,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
