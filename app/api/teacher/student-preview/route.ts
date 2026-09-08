import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { firestoreCollectionName, getAdminDb, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin";
import { readTeacherSession, TEACHER_COOKIE, TeacherAuthError } from "@/lib/server/teacher-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LooseDoc = { id: string } & Record<string, unknown>;

function docsWithIds(docs: QueryDocumentSnapshot[]): LooseDoc[] {
  return docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

async function requireTeacher() {
  if (!isFirebaseAdminConfigured()) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const cookieStore = await cookies();
  await readTeacherSession(cookieStore.get(TEACHER_COOKIE)?.value);
}

export async function GET(request: Request) {
  try {
    await requireTeacher();
    const db = getAdminDb();
    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId")?.trim() ?? "";

    if (!studentId) {
      const studentsSnap = await db.collection(firestoreCollectionName("students")).where("active", "==", true).get();
      const students = docsWithIds(studentsSnap.docs)
        .map((student) => ({
          id: student.id,
          name: String(student.name ?? ""),
          className: String(student.className ?? ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "ar"));
      return NextResponse.json({ students });
    }

    const [studentSnap, activeTermsSnap] = await Promise.all([
      db.collection(firestoreCollectionName("students")).doc(studentId).get(),
      db.collection(firestoreCollectionName("terms")).where("active", "==", true).limit(1).get(),
    ]);

    if (!studentSnap.exists || studentSnap.data()?.active !== true) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const rawStudent = (studentSnap.data() ?? {}) as Record<string, unknown>;
    const activeTermDoc = activeTermsSnap.docs[0];
    const activeTerm = activeTermDoc
      ? ({ id: activeTermDoc.id, ...(activeTermDoc.data() as Record<string, unknown>) } as LooseDoc)
      : null;
    const termId = activeTerm?.id;

    async function byTerm(collectionName: string) {
      if (!termId) return [] as LooseDoc[];
      const snap = await db.collection(firestoreCollectionName(collectionName)).where("termId", "==", termId).get();
      return docsWithIds(snap.docs);
    }

    const [subjects, skills, assessmentsSnap, values, starsSnap, spellingPractices] = await Promise.all([
      byTerm("subjects"),
      byTerm("skills"),
      db.collection(firestoreCollectionName("assessments")).where("studentId", "==", studentId).get(),
      byTerm("values"),
      db.collection(firestoreCollectionName("valueStars")).where("studentId", "==", studentId).get(),
      byTerm("spellingPractices"),
    ]);

    const activeSkills = skills.filter((skill) => skill.active !== false);
    const allowedSkillIds = new Set(activeSkills.map((skill) => skill.id));
    const assessments = docsWithIds(assessmentsSnap.docs)
      .filter((assessment) => allowedSkillIds.has(String(assessment.skillId ?? "")))
      .sort((a, b) => String(a.assessedAt ?? "").localeCompare(String(b.assessedAt ?? "")));

    return NextResponse.json({
      student: {
        id: studentSnap.id,
        name: String(rawStudent.name ?? ""),
        className: String(rawStudent.className ?? ""),
      },
      activeTerm,
      subjects: subjects
        .filter((subject) => subject.enabled !== false)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
      skills: activeSkills,
      assessments,
      values: values.filter((value) => value.active !== false),
      valueStars: docsWithIds(starsSnap.docs),
      spellingPractices: spellingPractices.filter((item) => item.active !== false),
    });
  } catch (error) {
    if (error instanceof TeacherAuthError) {
      return NextResponse.json({ error: error.code }, { status: error.code === "BACKEND_NOT_CONFIGURED" ? 503 : 401 });
    }
    console.error("teacher student preview failed", error);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
