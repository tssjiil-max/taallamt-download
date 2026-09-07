import { getAdminDb } from "./firebase-admin";

function withId<T extends FirebaseFirestore.DocumentData>(doc: FirebaseFirestore.QueryDocumentSnapshot<T>) {
  return { id: doc.id, ...doc.data() };
}

export async function loadGuardianBundle(studentId: string) {
  const db = getAdminDb();
  const studentRef = db.collection("students").doc(studentId);
  const [studentSnap, activeTermsSnap] = await Promise.all([
    studentRef.get(),
    db.collection("terms").where("active", "==", true).limit(1).get(),
  ]);

  if (!studentSnap.exists) return null;
  const rawStudent = studentSnap.data() ?? {};
  if (rawStudent.active !== true || rawStudent.guardianAccessEnabled !== true) return null;

  const activeTermDoc = activeTermsSnap.docs[0];
  const activeTerm = activeTermDoc ? { id: activeTermDoc.id, ...activeTermDoc.data() } : null;
  const termId = activeTerm?.id;

  const empty = Promise.resolve({ docs: [] } as unknown as FirebaseFirestore.QuerySnapshot);
  const [subjectsSnap, plansSnap, skillsSnap, assessmentsSnap, resourcesSnap, valuesSnap, starsSnap, spellingSnap, messagesSnap, followUpSnap] = await Promise.all([
    termId ? db.collection("subjects").where("termId", "==", termId).get() : empty,
    termId ? db.collection("weeklyPlans").where("termId", "==", termId).get() : empty,
    termId ? db.collection("skills").where("termId", "==", termId).get() : empty,
    db.collection("assessments").where("studentId", "==", studentId).get(),
    db.collection("resources").where("audienceStudentIds", "array-contains", studentId).get(),
    termId ? db.collection("values").where("termId", "==", termId).get() : empty,
    db.collection("valueStars").where("studentId", "==", studentId).get(),
    termId ? db.collection("spellingPractices").where("termId", "==", termId).get() : empty,
    db.collection("messages").where("studentId", "==", studentId).get(),
    db.collection("followUps").doc(studentId).get(),
  ]);

  const skills = skillsSnap.docs.map(withId).filter((skill) => skill.active !== false);
  const allowedSkillIds = new Set(skills.map((skill) => skill.id));
  const subjects = subjectsSnap.docs.map(withId).filter((subject) => subject.enabled !== false).sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const weeklyPlans = plansSnap.docs.map(withId).sort((a, b) => Number(a.week ?? 0) - Number(b.week ?? 0));
  const assessments = assessmentsSnap.docs.map(withId).filter((assessment) => allowedSkillIds.has(String(assessment.skillId ?? "")));
  const resources = resourcesSnap.docs
    .map(withId)
    .filter((resource) => resource.publishedToGuardian === true && (!termId || resource.termId === termId))
    .map(({ answerGuide: _answerGuide, ...resource }) => resource)
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  const values = valuesSnap.docs.map(withId).filter((value) => value.active !== false);
  const valueStars = starsSnap.docs.map(withId);
  const spellingPractices = spellingSnap.docs.map(withId).filter((item) => item.active !== false);
  const messages = messagesSnap.docs
    .map(withId)
    .sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")))
    .slice(-50);
  const followUpRaw = followUpSnap.exists ? followUpSnap.data() : undefined;
  const followUp = followUpRaw?.guardianVisible === true ? { studentId, ...followUpRaw } : null;

  return {
    student: {
      id: studentSnap.id,
      name: String(rawStudent.name ?? ""),
      className: String(rawStudent.className ?? ""),
      subjectLevels: rawStudent.subjectLevels ?? {},
      specialFollowUp: rawStudent.specialFollowUp === true,
    },
    activeTerm,
    subjects,
    weeklyPlans,
    skills,
    assessments,
    resources,
    values,
    valueStars,
    spellingPractices,
    followUp,
    messages,
  };
}
