import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";

type LooseDoc = { id: string } & Record<string, unknown>;

function docsWithIds(docs: QueryDocumentSnapshot[]): LooseDoc[] {
  return docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

export async function loadGuardianBundle(studentId: string) {
  const db = getAdminDb();
  const studentRef = db.collection("students").doc(studentId);
  const [studentSnap, activeTermsSnap] = await Promise.all([
    studentRef.get(),
    db.collection("terms").where("active", "==", true).limit(1).get(),
  ]);

  if (!studentSnap.exists) return null;
  const rawStudent = (studentSnap.data() ?? {}) as Record<string, unknown>;
  if (rawStudent.active !== true || rawStudent.guardianAccessEnabled !== true) return null;

  const activeTermDoc = activeTermsSnap.docs[0];
  const activeTerm = activeTermDoc
    ? ({ id: activeTermDoc.id, ...(activeTermDoc.data() as Record<string, unknown>) } as LooseDoc)
    : null;
  const termId = activeTerm?.id;

  async function byTerm(collectionName: string) {
    if (!termId) return [] as LooseDoc[];
    const snap = await db.collection(collectionName).where("termId", "==", termId).get();
    return docsWithIds(snap.docs);
  }

  const [subjects, weeklyPlans, skills, assessmentsSnap, resourcesSnap, values, starsSnap, spellingPractices, messagesSnap, followUpSnap] = await Promise.all([
    byTerm("subjects"),
    byTerm("weeklyPlans"),
    byTerm("skills"),
    db.collection("assessments").where("studentId", "==", studentId).get(),
    db.collection("resources").where("audienceStudentIds", "array-contains", studentId).get(),
    byTerm("values"),
    db.collection("valueStars").where("studentId", "==", studentId).get(),
    byTerm("spellingPractices"),
    db.collection("messages").where("studentId", "==", studentId).get(),
    db.collection("followUps").doc(studentId).get(),
  ]);

  const activeSkills = skills.filter((skill) => skill.active !== false);
  const allowedSkillIds = new Set(activeSkills.map((skill) => skill.id));
  const guardianSubjects = subjects
    .filter((subject) => subject.enabled !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const guardianWeeklyPlans = weeklyPlans.sort((a, b) => Number(a.week ?? 0) - Number(b.week ?? 0));
  const assessments = docsWithIds(assessmentsSnap.docs).filter((assessment) =>
    allowedSkillIds.has(String(assessment.skillId ?? "")),
  );
  const resources = docsWithIds(resourcesSnap.docs)
    .filter((resource) => resource.publishedToGuardian === true && (!termId || resource.termId === termId))
    .map(({ answerGuide: _answerGuide, ...resource }) => resource)
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const guardianValues = values.filter((value) => value.active !== false);
  const valueStars = docsWithIds(starsSnap.docs);
  const guardianSpellingPractices = spellingPractices.filter((item) => item.active !== false);
  const messages = docsWithIds(messagesSnap.docs)
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
    .slice(-50);
  const followUpRaw = followUpSnap.exists
    ? (followUpSnap.data() as Record<string, unknown>)
    : undefined;
  const followUp = followUpRaw?.guardianVisible === true ? { studentId, ...followUpRaw } : null;

  return {
    student: {
      id: studentSnap.id,
      name: String(rawStudent.name ?? ""),
      className: String(rawStudent.className ?? ""),
      subjectLevels: rawStudent.subjectLevels ?? {},
      specialFollowUp: rawStudent.specialFollowUp === true,
      guardianDevices: Number(rawStudent.guardianDevices ?? 0),
      guardianDeviceLimit: Math.max(1, Math.min(2, Number(rawStudent.guardianDeviceLimit ?? 2))),
    },
    activeTerm,
    subjects: guardianSubjects,
    weeklyPlans: guardianWeeklyPlans,
    skills: activeSkills,
    assessments,
    resources,
    values: guardianValues,
    valueStars,
    spellingPractices: guardianSpellingPractices,
    followUp,
    messages,
  };
}
