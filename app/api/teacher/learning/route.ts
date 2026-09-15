import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import {
  editDailyTask,
  editWeeklyItem,
  getTeacherLearningDashboard,
  riyadhDateKey,
  saveAutomationSettings,
  syncPublishedLearningContentForDateKey,
} from "@/lib/server/learning-automation";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

function dateOverrideAllowed() {
  return (
    process.env.VERCEL_ENV !== "production" ||
    process.env.VERCEL_GIT_COMMIT_REF === "build/taallamt-flex-v1" ||
    process.env.TAALLAMT_ENV === "staging"
  );
}

function errorResponse(error: unknown) {
  if (error instanceof TeacherAuthError) {
    return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
  }
  const message = error instanceof Error ? error.message : "SERVER_ERROR";
  console.error("teacher learning automation failed", error);
  const status = /INVALID|NOT_FOUND|ONLY_TODAY|STUDENT_NOT_IN_CLASS/.test(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireTeacher();
    const url = new URL(request.url);
    const requestedDate = url.searchParams.get("date")?.trim();
    const date = requestedDate && dateOverrideAllowed() ? requestedDate : riyadhDateKey();
    return NextResponse.json(await getTeacherLearningDashboard(date));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json().catch(() => ({}))) as { date?: unknown };
    const requestedDate = typeof body.date === "string" ? body.date.trim() : "";
    if (requestedDate && !dateOverrideAllowed()) {
      return NextResponse.json({ error: "DATE_OVERRIDE_DISABLED" }, { status: 403 });
    }
    const date = requestedDate || riyadhDateKey();
    const result = await syncPublishedLearningContentForDateKey(date);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireTeacher();
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "settings") {
      const settings = await saveAutomationSettings({
        ...(typeof body.autoWeeklyPlan === "boolean" ? { autoWeeklyPlan: body.autoWeeklyPlan } : {}),
        ...(typeof body.autoDailyAssignments === "boolean" ? { autoDailyAssignments: body.autoDailyAssignments } : {}),
        ...(typeof body.includeQuran === "boolean" ? { includeQuran: body.includeQuran } : {}),
        ...(typeof body.includeSkillPractice === "boolean" ? { includeSkillPractice: body.includeSkillPractice } : {}),
      });
      return NextResponse.json({ ok: true, settings });
    }

    if (action === "edit-task") {
      const date = String(body.date ?? "");
      const taskId = String(body.taskId ?? "");
      const taskText = String(body.taskText ?? "");
      if (!date || !taskId || !taskText.trim()) return NextResponse.json({ error: "INVALID_EDIT" }, { status: 400 });
      await editDailyTask(date, taskId, taskText);
      return NextResponse.json({ ok: true });
    }

    if (action === "edit-weekly") {
      const weekStart = String(body.weekStart ?? "");
      const itemId = String(body.itemId ?? "");
      const expectedTask = String(body.expectedTask ?? "");
      if (!weekStart || !itemId || !expectedTask.trim()) return NextResponse.json({ error: "INVALID_EDIT" }, { status: 400 });
      await editWeeklyItem(weekStart, itemId, expectedTask);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
