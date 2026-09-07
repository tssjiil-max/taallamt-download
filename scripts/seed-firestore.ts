import type { DocumentData } from "firebase-admin/firestore";
import { initialData } from "../lib/sample-data";
import { firestoreCollectionName, getAdminDb } from "../lib/server/firebase-admin";
import { normalizeGuardianSearchName } from "../lib/server/guardian-auth";

if (process.env.ALLOW_FIRESTORE_SEED !== "YES") {
  throw new Error("Refusing to seed Firestore. Set ALLOW_FIRESTORE_SEED=YES explicitly for this one-time migration.");
}

const db = getAdminDb();
const writer = db.bulkWriter();
let writes = 0;

writer.onWriteError((error) => {
  console.error(`Firestore write failed for ${error.documentRef.path}: ${error.message}`);
  return error.failedAttempts < 3;
});

function clean(value: unknown): DocumentData {
  return JSON.parse(JSON.stringify(value)) as DocumentData;
}

function put(collection: string, id: string, data: unknown) {
  writes += 1;
  writer.set(db.collection(firestoreCollectionName(collection)).doc(id), clean(data), { merge: true });
}

for (const term of initialData.terms) put("terms", term.id, term);
for (const subject of initialData.subjects) put("subjects", subject.id, subject);
for (const student of initialData.students) {
  const {
    guardianAccessCodeHash: _guardianAccessCodeHash,
    guardianAccessEnabled: _guardianAccessEnabled,
    guardianCodeUpdatedAt: _guardianCodeUpdatedAt,
    guardianDevices: _guardianDevices,
    ...safeStudent
  } = student;
  put("students", student.id, {
    ...safeStudent,
    guardianDeviceLimit: 2,
    guardianSearchName: normalizeGuardianSearchName(student.name),
  });
}
for (const plan of initialData.weeklyPlans) put("weeklyPlans", plan.id, plan);
for (const skill of initialData.skills) put("skills", skill.id, skill);
for (const assessment of initialData.assessments) put("assessments", assessment.id, assessment);
for (const resource of initialData.resources) put("resources", resource.id, resource);
for (const value of initialData.values) put("values", value.id, value);
for (const star of initialData.valueStars) put("valueStars", star.id, star);
for (const practice of initialData.spellingPractices) put("spellingPractices", practice.id, practice);
for (const message of initialData.messages) put("messages", message.id, message);
for (const [studentId, followUp] of Object.entries(initialData.followUps)) put("followUps", studentId, followUp);

await writer.close();
console.log(`Taallamt Firestore seed completed in isolated collections: ${writes} documents merged.`);
