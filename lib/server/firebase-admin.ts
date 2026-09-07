import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_COLLECTION_PREFIX = "taallamt_v2";

export function isFirebaseAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY,
  );
}

export function firestoreCollectionName(baseName: string) {
  const configured = (process.env.FIRESTORE_COLLECTION_PREFIX || DEFAULT_COLLECTION_PREFIX).trim();
  const prefix = configured.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || DEFAULT_COLLECTION_PREFIX;
  const safeBase = baseName.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${prefix}_${safeBase}`;
}

function privateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

export function getAdminDb() {
  if (!isFirebaseAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey(),
      }),
    });

  return getFirestore(app);
}
