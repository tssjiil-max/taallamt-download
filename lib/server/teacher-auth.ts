import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { authSecretConfigured, requireAuthSecret } from "./auth-secret";
import { firestoreCollectionName, getAdminDb } from "./firebase-admin";

export const TEACHER_COOKIE = "taallamt_teacher_session";
const SESSION_DAYS = 7;

export const teacherCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

type TeacherSession = {
  tokenHash?: string;
  expiresAtMs?: number;
  revokedAtMs?: number | null;
};

type TeacherAuthDoc = {
  pinHash?: string;
  configuredAt?: string;
  version?: number;
};

export class TeacherAuthError extends Error {
  constructor(
    public readonly code:
      | "INVALID_PIN"
      | "INVALID_SESSION"
      | "BACKEND_NOT_CONFIGURED"
      | "ALREADY_CONFIGURED",
  ) {
    super(code);
  }
}

function teacherSecret() {
  try {
    return requireAuthSecret();
  } catch {
    throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  }
}

function parsePinHash(value: string) {
  const [version, salt, hash] = value.split(":", 3);
  if (version !== "scrypt-v2" || !salt || !hash || salt.length < 16 || hash.length !== 64) {
    throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  }
  return { salt, hash };
}

export function hashTeacherPin(pin: string, salt = randomBytes(16).toString("hex")) {
  if (!/^\d{6}$/.test(pin)) throw new TeacherAuthError("INVALID_PIN");
  const hash = scryptSync(`${teacherSecret()}:${pin}`, salt, 32).toString("hex");
  return `scrypt-v2:${salt}:${hash}`;
}

async function storedPinHash() {
  const snap = await getAdminDb()
    .collection(firestoreCollectionName("system"))
    .doc("teacherAuth")
    .get();
  if (!snap.exists) return null;
  const data = snap.data() as TeacherAuthDoc;
  return typeof data.pinHash === "string" ? data.pinHash : null;
}

export async function teacherAuthConfigured() {
  if (!authSecretConfigured()) return false;
  try {
    const value = await storedPinHash();
    if (!value) return false;
    parsePinHash(value);
    return true;
  } catch {
    return false;
  }
}

export async function setupTeacherPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new TeacherAuthError("INVALID_PIN");
  teacherSecret();

  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName("system")).doc("teacherAuth");
  const pinHash = hashTeacherPin(pin);

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.data() as TeacherAuthDoc | undefined;
    if (snap.exists && typeof current?.pinHash === "string" && current.pinHash) {
      throw new TeacherAuthError("ALREADY_CONFIGURED");
    }
    transaction.set(
      ref,
      {
        pinHash,
        configuredAt: new Date().toISOString(),
        version: 2,
      },
      { merge: true },
    );
  });
}

async function verifyTeacherPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) return false;
  const value = await storedPinHash();
  if (!value) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  const expected = parsePinHash(value);
  const actual = scryptSync(`${teacherSecret()}:${pin}`, expected.salt, 32).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected.hash, "hex"));
}

function hashToken(sessionId: string, token: string) {
  return createHmac("sha256", teacherSecret()).update(`${sessionId}:${token}`, "utf8").digest("hex");
}

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function parseCookie(value?: string) {
  if (!value) return null;
  const [sessionId, token] = value.split(".", 2);
  if (!sessionId || !token || token.length < 30) return null;
  return { sessionId, token };
}

export async function createTeacherSession(pin: string) {
  teacherSecret();
  if (!(await verifyTeacherPin(pin))) throw new TeacherAuthError("INVALID_PIN");
  const now = Date.now();
  const expiresAtMs = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  await getAdminDb().collection(firestoreCollectionName("teacherSessions")).doc(sessionId).set({
    tokenHash: hashToken(sessionId, token),
    createdAtMs: now,
    expiresAtMs,
    revokedAtMs: null,
  });
  return { cookieValue: `${sessionId}.${token}`, expiresAtMs };
}

export async function readTeacherSession(cookieValue?: string) {
  teacherSecret();
  const parsed = parseCookie(cookieValue);
  if (!parsed) throw new TeacherAuthError("INVALID_SESSION");
  const snap = await getAdminDb().collection(firestoreCollectionName("teacherSessions")).doc(parsed.sessionId).get();
  if (!snap.exists) throw new TeacherAuthError("INVALID_SESSION");
  const session = snap.data() as TeacherSession;
  if (!session.tokenHash || session.revokedAtMs || !session.expiresAtMs || session.expiresAtMs <= Date.now()) {
    throw new TeacherAuthError("INVALID_SESSION");
  }
  const actual = hashToken(parsed.sessionId, parsed.token);
  if (!safeHexEqual(actual, session.tokenHash)) throw new TeacherAuthError("INVALID_SESSION");
  return { sessionId: parsed.sessionId, expiresAtMs: session.expiresAtMs };
}

export async function revokeTeacherSession(cookieValue?: string) {
  teacherSecret();
  const parsed = parseCookie(cookieValue);
  if (!parsed) return;
  const ref = getAdminDb().collection(firestoreCollectionName("teacherSessions")).doc(parsed.sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const session = snap.data() as TeacherSession;
  if (!session.tokenHash) return;
  const actual = hashToken(parsed.sessionId, parsed.token);
  if (!safeHexEqual(actual, session.tokenHash)) return;
  await ref.set({ revokedAtMs: Date.now() }, { merge: true });
}
