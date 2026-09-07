import { firestoreCollectionName, getAdminDb } from "./firebase-admin";
import { hashGuardianAccessCode, normalizeGuardianSearchName } from "./guardian-auth";

export async function setGuardianAccessCodeOnServer(studentId: string, code: string) {
  if (!studentId || !/^\d{6}$/.test(code)) return false;

  const db = getAdminDb();
  const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return false;
  const student = studentSnap.data() ?? {};

  const oldSessions = await db.collection(firestoreCollectionName("guardianSessions")).where("studentId", "==", studentId).get();
  const batch = db.batch();
  for (const doc of oldSessions.docs) {
    batch.set(doc.ref, { revokedAtMs: Date.now() }, { merge: true });
  }
  batch.set(
    studentRef,
    {
      guardianAccessEnabled: true,
      guardianAccessCodeHash: hashGuardianAccessCode(studentId, code),
      guardianCodeUpdatedAt: new Date().toISOString(),
      guardianSearchName: normalizeGuardianSearchName(String(student.name ?? "")),
      guardianSessionSlots: [],
      guardianDevices: 0,
      guardianDeviceLimit: 2,
    },
    { merge: true },
  );
  await batch.commit();
  return true;
}

export async function disableGuardianAccessOnServer(studentId: string) {
  const db = getAdminDb();
  const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
  const sessions = await db.collection(firestoreCollectionName("guardianSessions")).where("studentId", "==", studentId).get();
  const batch = db.batch();
  for (const doc of sessions.docs) {
    batch.set(doc.ref, { revokedAtMs: Date.now() }, { merge: true });
  }
  batch.set(
    studentRef,
    {
      guardianAccessEnabled: false,
      guardianAccessCodeHash: null,
      guardianCodeUpdatedAt: new Date().toISOString(),
      guardianSessionSlots: [],
      guardianDevices: 0,
    },
    { merge: true },
  );
  await batch.commit();
}
