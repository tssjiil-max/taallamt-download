import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { syncPublishedLearningContent } from "@/lib/server/learning-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "BACKEND_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const result = await syncPublishedLearningContent();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("scheduled learning automation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "SERVER_ERROR" }, { status: 500 });
  }
}
