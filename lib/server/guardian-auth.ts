import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { requireAuthSecret } from "./auth-secret";
import { firestoreCollectionName, getAdminDb } from "./firebase-admin";

export const GUARDIAN_COOKIE = "taallamt_guardian_session";
export const GUARDIAN_SESSION_DAYS = 30;

export const guardianCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: GUARDIAN_SESSION_DAYS * 24 * 60 * 60,
};

type GuardianSlot = {
  id: string;
  expiresAtMs: number;
};

type StudentAuthData = {
  active?: boolean;
  guardianAccessEnabled?: boolean;
  guardianAccessCodeHash?: string;
  guardianDeviceLimit?: number;
  guardianSessionSlots?: GuardianSlot[];
};

type SessionData = {
  studentId?: string;
  tokenHash?: string;
  createdAtMs?: number;
  expiresAtMs?: number;
  revokedAtMs?: number | null;
};

export class GuardianAuthError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "ACCESS_DISABLED"
      | "INVALID_CODE"
      | "DEVICE_LIMIT"
      | "INVALID_SESSION"
      | "BACKEND_NOT_CONFIGURED",
  ) {
    super(code);
  }
}

function guardianSecret() {
  try {
    return requireAuthSecret();
  } catch {
    throw new GuardianAuthError("BACKEND_NOT_CONFIGURED");
  }
}

function safeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function normalizeGuardianSearchName(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashGuardianAccessCode(studentId: string, code: string, salt = randomBytes(16).toString("hex")) {
  if (!studentId || !/^\d{6}$/.test(code)) throw new GuardianAuthError("INVALID_CODE");
  const hash = scryptSync(`${guardianSecret()}:${studentId}:${code}`, salt, 32).toString("hex");
  return `scrypt-v2:${salt}:${hash}`;
}

function verifyGuardianAccessCode(studentId: string, code: string, storedHash: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const [version, salt, expected] = storedHash.split(":", 3);
  if (version !== "scrypt-v2" || !salt || salt.length < 16 || !expected || expected.length !== 64) return false;
  const actual = scryptSync(`${guardianSecret()}:${studentId}:${code}`, salt, 32).toString("hex");
  return safeHexEqual(actual, expected);
}

function hashSessionToken(sessionId: string, token: string) {
  return createHmac("sha256", guardianSecret()).update(`${sessionId}:${token}`, "utf8").digest("hex");
}

function parseCookie(value?: string) {
  if (!value) return null;
  const [sessionId, token] = value.split(".", 2);
  if (!sessionId || !token || token.length < 30) return null;
  return { sessionId, token };
}

export async function createGuardianSession(studentId: string) {
  if (!studentId) throw new GuardianAuthError("NOT_FOUND");
  guardianSecret();

  const db = getAdminDb();
  const now = Date.now();
  const expiresAtMs = now + GUARDIAN_SESSION_DAYS * 24 * 60 * 60 * 1000;
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const studentRef = db.collection(firestoreCollectionName("students")).doc(studentId);
  const sessionRef = db.collection(firestoreCollectionName("guardianSessions")).doc(sessionId);

  await db.runTransaction(async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    if (!studentSnap.exists) throw new GuardianAuthError("NOT_FOUND");

    const student = studentSnap.data() as StudentAuthData;
    if (!student.active) {
      throw new GuardianAuthError("ACCESS_DISABLED");
    }
    const slots = (student.guardianSessionSlots ?? []).filter(
      (slot) => slot && typeof slot.id === "string" && Number(slot.expiresAtMs) > now,
    );

    transaction.set(sessionRef, {
      studentId,
      tokenHash: hashSessionToken(sessionId, token),
      createdAtMs: now,
      expiresAtMs,
      revokedAtMs: null,
    });
    transaction.update(studentRef, {
      guardianSessionSlots: [...slots, { id: sessionId, expiresAtMs }],
      guardianDevices: slots.length + 1,
    });
  });

  return { cookieValue: `${sessionId}.${token}`, sessionId, expiresAtMs };
}

export async function readGuardianSession(cookieValue?: string) {
  guardianSecret();
  const parsed = parseCookie(cookieValue);
  if (!parsed) throw new GuardianAuthError("INVALID_SESSION");

  const db = getAdminDb();
  const sessionSnap = await db.collection(firestoreCollectionName("guardianSessions")).doc(parsed.sessionId).get();
  if (!sessionSnap.exists) throw new GuardianAuthError("INVALID_SESSION");
  const session = sessionSnap.data() as SessionData;

  if (
    !session.studentId ||
    !session.tokenHash ||
    session.revokedAtMs ||
    !session.expiresAtMs ||
    session.expiresAtMs <= Date.now() ||
    !safeHexEqual(hashSessionToken(parsed.sessionId, parsed.token), session.tokenHash)
  ) {
    throw new GuardianAuthError("INVALID_SESSION");
  }

  const studentSnap = await db.collection(firestoreCollectionName("students")).doc(session.studentId).get();
  const student = studentSnap.data() as StudentAuthData | undefined;
  if (!studentSnap.exists || !student?.active) {
    throw new GuardianAuthError("INVALID_SESSION");
  }

  return { sessionId: parsed.sessionId, studentId: session.studentId, expiresAtMs: session.expiresAtMs };
}

export async function revokeGuardianSession(cookieValue?: string) {
  guardianSecret();
  const parsed = parseCookie(cookieValue);
  if (!parsed) return;

  const db = getAdminDb();
  const sessionRef = db.collection(firestoreCollectionName("guardianSessions")).doc(parsed.sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return;
  const session = sessionSnap.data() as SessionData;
  if (!session.studentId || !session.tokenHash) return;
  if (!safeHexEqual(hashSessionToken(parsed.sessionId, parsed.token), session.tokenHash)) return;

  const studentRef = db.collection(firestoreCollectionName("students")).doc(session.studentId);
  await db.runTransaction(async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    const student = studentSnap.data() as StudentAuthData | undefined;
    const slots = (student?.guardianSessionSlots ?? []).filter((slot) => slot.id !== parsed.sessionId);
    transaction.set(sessionRef, { revokedAtMs: Date.now() }, { merge: true });
    if (studentSnap.exists) {
      transaction.update(studentRef, { guardianSessionSlots: slots, guardianDevices: slots.length });
    }
  });
}
