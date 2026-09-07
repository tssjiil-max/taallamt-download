import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
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

function requiredSecret(name: "GUARDIAN_CODE_PEPPER" | "GUARDIAN_SESSION_PEPPER") {
  const direct = process.env[name];
  const fallback = name === "GUARDIAN_SESSION_PEPPER" ? process.env.GUARDIAN_CODE_PEPPER : undefined;
  const value = direct || fallback;
  if (!value || value.length < 24) throw new GuardianAuthError("BACKEND_NOT_CONFIGURED");
  return value;
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
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

export function hashGuardianAccessCode(studentId: string, code: string) {
  return sha256(`${requiredSecret("GUARDIAN_CODE_PEPPER")}:${studentId}:${code}`);
}

function hashSessionToken(sessionId: string, token: string) {
  return sha256(`${requiredSecret("GUARDIAN_SESSION_PEPPER")}:${sessionId}:${token}`);
}

function safeHashEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function parseCookie(value?: string) {
  if (!value) return null;
  const [sessionId, token] = value.split(".", 2);
  if (!sessionId || !token || token.length < 30) return null;
  return { sessionId, token };
}

export async function createGuardianSession(studentId: string, code: string) {
  if (!studentId || !/^\d{6}$/.test(code)) throw new GuardianAuthError("INVALID_CODE");

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
    if (!student.active || !student.guardianAccessEnabled || !student.guardianAccessCodeHash) {
      throw new GuardianAuthError("ACCESS_DISABLED");
    }

    const submittedHash = hashGuardianAccessCode(studentId, code);
    if (!safeHashEqual(submittedHash, student.guardianAccessCodeHash)) {
      throw new GuardianAuthError("INVALID_CODE");
    }

    const limit = Math.max(1, Math.min(2, student.guardianDeviceLimit ?? 2));
    const slots = (student.guardianSessionSlots ?? []).filter(
      (slot) => slot && typeof slot.id === "string" && Number(slot.expiresAtMs) > now,
    );
    if (slots.length >= limit) throw new GuardianAuthError("DEVICE_LIMIT");

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
    !safeHashEqual(hashSessionToken(parsed.sessionId, parsed.token), session.tokenHash)
  ) {
    throw new GuardianAuthError("INVALID_SESSION");
  }

  const studentSnap = await db.collection(firestoreCollectionName("students")).doc(session.studentId).get();
  const student = studentSnap.data() as StudentAuthData | undefined;
  if (!studentSnap.exists || !student?.active || !student.guardianAccessEnabled) {
    throw new GuardianAuthError("INVALID_SESSION");
  }

  return { sessionId: parsed.sessionId, studentId: session.studentId, expiresAtMs: session.expiresAtMs };
}

export async function revokeGuardianSession(cookieValue?: string) {
  const parsed = parseCookie(cookieValue);
  if (!parsed) return;

  const db = getAdminDb();
  const sessionRef = db.collection(firestoreCollectionName("guardianSessions")).doc(parsed.sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) return;
  const session = sessionSnap.data() as SessionData;
  if (!session.studentId || !session.tokenHash) return;
  if (!safeHashEqual(hashSessionToken(parsed.sessionId, parsed.token), session.tokenHash)) return;

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
