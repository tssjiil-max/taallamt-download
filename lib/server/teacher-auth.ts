import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { getAdminDb } from "./firebase-admin";

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

export class TeacherAuthError extends Error {
  constructor(public readonly code: "INVALID_PIN" | "INVALID_SESSION" | "BACKEND_NOT_CONFIGURED") {
    super(code);
  }
}

function requiredEnv(name: "TEACHER_ACCESS_PIN_HASH" | "TEACHER_SESSION_PEPPER") {
  const value = process.env[name];
  if (!value || value.length < 24) throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  return value;
}

function parsePinHash(value: string) {
  const [salt, hash] = value.split(":", 2);
  if (!salt || !hash || salt.length < 16 || hash.length !== 64) {
    throw new TeacherAuthError("BACKEND_NOT_CONFIGURED");
  }
  return { salt, hash };
}

export function hashTeacherPin(pin: string, salt = randomBytes(16).toString("hex")) {
  if (!/^\d{6}$/.test(pin)) throw new TeacherAuthError("INVALID_PIN");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function verifyTeacherPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) return false;
  const expected = parsePinHash(requiredEnv("TEACHER_ACCESS_PIN_HASH"));
  const actual = scryptSync(pin, expected.salt, 32).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected.hash, "hex"));
}

function hashToken(sessionId: string, token: string) {
  return createHash("sha256")
    .update(`${requiredEnv("TEACHER_SESSION_PEPPER")}:${sessionId}:${token}`, "utf8")
    .digest("hex");
}

function parseCookie(value?: string) {
  if (!value) return null;
  const [sessionId, token] = value.split(".", 2);
  if (!sessionId || !token || token.length < 30) return null;
  return { sessionId, token };
}

export async function createTeacherSession(pin: string) {
  if (!verifyTeacherPin(pin)) throw new TeacherAuthError("INVALID_PIN");
  const now = Date.now();
  const expiresAtMs = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  await getAdminDb().collection("teacherSessions").doc(sessionId).set({
    tokenHash: hashToken(sessionId, token),
    createdAtMs: now,
    expiresAtMs,
    revokedAtMs: null,
  });
  return { cookieValue: `${sessionId}.${token}`, expiresAtMs };
}

export async function readTeacherSession(cookieValue?: string) {
  const parsed = parseCookie(cookieValue);
  if (!parsed) throw new TeacherAuthError("INVALID_SESSION");
  const snap = await getAdminDb().collection("teacherSessions").doc(parsed.sessionId).get();
  if (!snap.exists) throw new TeacherAuthError("INVALID_SESSION");
  const session = snap.data() as TeacherSession;
  if (!session.tokenHash || session.revokedAtMs || !session.expiresAtMs || session.expiresAtMs <= Date.now()) {
    throw new TeacherAuthError("INVALID_SESSION");
  }
  const actual = hashToken(parsed.sessionId, parsed.token);
  if (actual.length !== session.tokenHash.length || !timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(session.tokenHash, "utf8"))) {
    throw new TeacherAuthError("INVALID_SESSION");
  }
  return { sessionId: parsed.sessionId, expiresAtMs: session.expiresAtMs };
}

export async function revokeTeacherSession(cookieValue?: string) {
  const parsed = parseCookie(cookieValue);
  if (!parsed) return;
  const ref = getAdminDb().collection("teacherSessions").doc(parsed.sessionId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const session = snap.data() as TeacherSession;
  if (!session.tokenHash) return;
  const actual = hashToken(parsed.sessionId, parsed.token);
  if (actual.length !== session.tokenHash.length || !timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(session.tokenHash, "utf8"))) return;
  await ref.set({ revokedAtMs: Date.now() }, { merge: true });
}
