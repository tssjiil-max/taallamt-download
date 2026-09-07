"use client";

import type { TaallamtData } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw Object.assign(new Error("REQUEST_FAILED"), { status: response.status, payload });
  return payload;
}

export async function teacherSetup(pin: string) {
  const response = await fetch("/api/teacher/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return readJson<{ ok: true; expiresAtMs: number }>(response);
}

export async function teacherLogin(pin: string) {
  const response = await fetch("/api/teacher/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  return readJson<{ ok: true; expiresAtMs: number }>(response);
}

export async function teacherMe() {
  const response = await fetch("/api/teacher/me", { cache: "no-store" });
  return readJson<{ authenticated: true; expiresAtMs: number }>(response);
}

export async function teacherLogout() {
  const response = await fetch("/api/teacher/logout", { method: "POST" });
  return readJson<{ ok: true }>(response);
}

export async function teacherSync(data: TaallamtData) {
  const response = await fetch("/api/teacher/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return readJson<{ ok: true; writes: number }>(response);
}

export async function setGuardianAccessCode(studentId: string, code: string) {
  const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/guardian-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  return readJson<{ ok: true }>(response);
}

export async function disableGuardianAccess(studentId: string) {
  const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/guardian-access`, {
    method: "DELETE",
  });
  return readJson<{ ok: true }>(response);
}
