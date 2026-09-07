import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_COLLECTION_PREFIX = "taallamt_v2";

type ServiceAccountLike = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

type FirebaseCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(raw: string) {
  let value = raw.trim();

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as ServiceAccountLike;
      if (typeof parsed.private_key === "string") value = parsed.private_key;
    } catch {
      // Continue with the raw value and normalize common copy/paste formats below.
    }
  }

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

  const pem = value.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);
  if (pem) value = pem[0];

  return value;
}

function parseServiceAccountJson(raw: string): FirebaseCredentials | null {
  try {
    const parsed = JSON.parse(raw) as ServiceAccountLike;
    if (
      typeof parsed.project_id !== "string" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return null;
    }

    return {
      projectId: parsed.project_id.trim(),
      clientEmail: parsed.client_email.trim(),
      privateKey: normalizePrivateKey(parsed.private_key),
    };
  } catch {
    return null;
  }
}

function credentials(): FirebaseCredentials | null {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64?.trim();
  if (base64) {
    try {
      const decoded = Buffer.from(base64, "base64").toString("utf8");
      const parsed = parseServiceAccountJson(decoded);
      if (parsed) return parsed;
    } catch {
      // Fall back to other supported formats.
    }
  }

  const fullJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (fullJson) {
    const parsed = parseServiceAccountJson(fullJson);
    if (parsed) return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) return null;

  // If the full JSON was pasted into FIREBASE_PRIVATE_KEY, use all three fields from it.
  const pastedJson = parseServiceAccountJson(privateKeyRaw.trim());
  if (pastedJson) return pastedJson;

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
  };
}

export function isFirebaseAdminConfigured() {
  return Boolean(credentials());
}

export function firestoreCollectionName(baseName: string) {
  const configured = (process.env.FIRESTORE_COLLECTION_PREFIX || DEFAULT_COLLECTION_PREFIX).trim();
  const prefix = configured.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || DEFAULT_COLLECTION_PREFIX;
  const safeBase = baseName.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${prefix}_${safeBase}`;
}

export function getAdminDb() {
  const serviceAccount = credentials();
  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin is not configured. Prefer FIREBASE_SERVICE_ACCOUNT_B64, or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
    });

  return getFirestore(app);
}
