import { createHash } from "node:crypto";
import { firestoreCollectionName, getAdminDb } from "./firebase-admin";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

type RateDoc = {
  attempts?: number;
  windowStartedAtMs?: number;
  blockedUntilMs?: number;
};

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 32);
}

export function rateLimitKey(request: Request, scope: string, subject = "") {
  return `${scope}_${digest(`${requestIp(request)}:${subject}`)}`;
}

export async function rateLimitBlocked(key: string) {
  const snap = await getAdminDb().collection(firestoreCollectionName("rateLimits")).doc(key).get();
  if (!snap.exists) return { blocked: false, retryAfterSeconds: 0 };
  const data = snap.data() as RateDoc;
  const remaining = Number(data.blockedUntilMs ?? 0) - Date.now();
  return {
    blocked: remaining > 0,
    retryAfterSeconds: remaining > 0 ? Math.max(1, Math.ceil(remaining / 1000)) : 0,
  };
}

export async function recordLoginFailure(key: string, maxAttempts: number) {
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName("rateLimits")).doc(key);
  const now = Date.now();

  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const current = (snap.data() as RateDoc | undefined) ?? {};
    const inWindow = Number(current.windowStartedAtMs ?? 0) + WINDOW_MS > now;
    const attempts = inWindow ? Number(current.attempts ?? 0) + 1 : 1;
    const windowStartedAtMs = inWindow ? Number(current.windowStartedAtMs ?? now) : now;
    const blockedUntilMs = attempts >= maxAttempts ? now + BLOCK_MS : Number(current.blockedUntilMs ?? 0);

    transaction.set(
      ref,
      {
        attempts,
        windowStartedAtMs,
        blockedUntilMs,
        updatedAtMs: now,
      },
      { merge: true },
    );
  });
}

export async function clearLoginFailures(key: string) {
  await getAdminDb().collection(firestoreCollectionName("rateLimits")).doc(key).delete().catch(() => undefined);
}
