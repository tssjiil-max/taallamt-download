"use client";

import type { FollowUpCategory } from "./types";

export type GuardianSearchStudent = {
  id: string;
  name: string;
  className: string;
};

export type GuardianBackendStatus = {
  ready: boolean;
  firebaseConfigured?: boolean;
  firebase: boolean;
  guardianAuth: boolean;
  teacherAuth?: boolean;
  teacherSetupRequired?: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw Object.assign(new Error("REQUEST_FAILED"), { status: response.status, payload });
  return payload;
}

export async function guardianBackendStatus() {
  const response = await fetch("/api/backend/status", { cache: "no-store" });
  return readJson<GuardianBackendStatus>(response);
}

export async function guardianSearch(query: string) {
  const response = await fetch("/api/guardian/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return readJson<{ students: GuardianSearchStudent[] }>(response);
}

export async function guardianLogin(studentId: string, code: string) {
  const response = await fetch("/api/guardian/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, code }),
  });
  return readJson<{ ok: true; expiresAtMs: number }>(response);
}

export async function guardianMe<T = Record<string, unknown>>() {
  const response = await fetch("/api/guardian/me", { cache: "no-store" });
  return readJson<T>(response);
}

export async function guardianLogout() {
  const response = await fetch("/api/guardian/logout", { method: "POST" });
  return readJson<{ ok: true }>(response);
}

export async function guardianSendMessage(body: string) {
  const response = await fetch("/api/guardian/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return readJson<{ ok: true }>(response);
}

export async function guardianSendFollowUp(category: FollowUpCategory, statement: string) {
  const response = await fetch("/api/guardian/follow-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, statement }),
  });
  return readJson<{ ok: true }>(response);
}
