import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { normalizeGuardianSearchName } from "@/lib/server/guardian-auth";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";
import type { TaallamtData } from "@/lib/types";

export const runtime = "nodejs";

const collectionLimits: Record<keyof Omit<TaallamtData, "followUps" | "behaviorEvaluations">, number> = {
  terms: 20,
  subjects: 100,
  students: 200,
  weeklyPlans: 1500,
  skills: 5000,
  assessments: 25000,
  resources: 5000,
  values: 1000,
  valueStars: 20000,
  spellingPractices: 1000,
  messages: 10000,
};

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function POST(request: Request) {
  try {
    await requireTeacher();
    const raw = (await request.json().catch(() => null)) as unknown;
    if (!isPlainObject(raw)) return NextResponse.json({ error: "INVALID_DATA" }, { status: 400 });

    for (const [key, limit] of Object.entries(collectionLimits)) {
      const value = raw[key];
      if (!Array.isArray(value) || value.length > limit) {
        return NextResponse.json({ error: "INVALID_DATA", field: key }, { status: 400 });
      }
    }
    if (!isPlainObject(raw.followUps) || Object.keys(raw.followUps).length > 200) {
      return NextResponse.json({ error: "INVALID_DATA", field: "followUps" }, { status: 400 });
    }

    const data = raw as unknown as TaallamtData;
    const db = getAdminDb();
    const writer = db.bulkWriter();
    let writes = 0;

    writer.onWriteError((error) => {
      console.error(`sync write failed for ${error.documentRef.path}: ${error.message}`);
      return error.failedAttempts < 3;
    });

    function put(collection: string, id: string, value: Record<string, unknown>) {
      if (!id || id.length > 200) return;
      writes += 1;
      writer.set(db.collection(firestoreCollectionName(collection)).doc(id), clean(value), { merge: true });
    }

    for (const term of data.terms) put("terms", term.id, term as unknown as Record<string, unknown>);
    for (const subject of data.subjects) put("subjects", subject.id, subject as unknown as Record<string, unknown>);
    for (const student of data.students) {
      const {
        guardianAccessCodeHash: _guardianAccessCodeHash,
        guardianAccessEnabled: _guardianAccessEnabled,
        guardianCodeUpdatedAt: _guardianCodeUpdatedAt,
        guardianDevices: _guardianDevices,
        ...safeStudent
      } = student;
      put("students", student.id, {
        ...(safeStudent as unknown as Record<string, unknown>),
        guardianSearchName: normalizeGuardianSearchName(student.name),
        guardianDeviceLimit: 2,
      });
    }
    for (const plan of data.weeklyPlans) put("weeklyPlans", plan.id, plan as unknown as Record<string, unknown>);
    for (const skill of data.skills) put("skills", skill.id, skill as unknown as Record<string, unknown>);
    for (const assessment of data.assessments) put("assessments", assessment.id, assessment as unknown as Record<string, unknown>);
    for (const resource of data.resources) put("resources", resource.id, resource as unknown as Record<string, unknown>);
    for (const value of data.values) put("values", value.id, value as unknown as Record<string, unknown>);
    for (const star of data.valueStars) put("valueStars", star.id, star as unknown as Record<string, unknown>);
    for (const practice of data.spellingPractices) put("spellingPractices", practice.id, practice as unknown as Record<string, unknown>);
    for (const message of data.messages) put("messages", message.id, message as unknown as Record<string, unknown>);
    for (const [studentId, followUp] of Object.entries(data.followUps)) {
      put("followUps", studentId, followUp as unknown as Record<string, unknown>);
    }

    await writer.close();
    return NextResponse.json({ ok: true, writes, collectionPrefix: firestoreCollectionName("").replace(/_$/, "") });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher sync failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
