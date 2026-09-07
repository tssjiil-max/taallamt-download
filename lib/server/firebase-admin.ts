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
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;

  let value = raw.trim();

  // Accept the full Firebase service-account JSON if it was pasted by mistake.
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as { private_key?: unknown };
      if (typeof parsed.private_key === "string") value = parsed.private_key;
    } catch {
      // Continue with the raw value and normalize common copy/paste formats below.
    }
  }

  // Accept a copied `"private_key": "..."` fragment.
  const fragment = value.match(/["']?private_key["']?\s*:\s*([\s\S]+)$/);
  if (fragment) {
    let candidate = fragment[1].trim().replace(/,\s*$/, "");
    if (candidate.startsWith('"')) {
      try {
        candidate = JSON.parse(candidate);
      } catch {
        candidate = candidate.replace(/^"|"$/g, "");
      }
    } else if (candidate.startsWith("'") && candidate.endsWith("'")) {
      candidate = candidate.slice(1, -1);
    }
    value = candidate;
  } else if (value.startsWith('"') && value.endsWith('"')) {
    try {
      value = JSON.parse(value);
    } catch {
      value = value.slice(1, -1);
    }
  }

  value = value
    .replace(/\\r/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r/g, "")
    .trim();

  // If extra JSON/text was copied around the PEM block, keep only the PEM itself.
  const pem = value.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  if (pem) value = pem[0];

  return value;
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
