"use client";

import type { FollowUpCategory } from "./types";

export type GuardianSearchStudent = { id: string; name: string; className: string };
export type GuardianBackendStatus = { ready: boolean; firebaseConfigured?: boolean; firebase: boolean; authSecret?: boolean; guardianAuth: boolean; teacherAuth?: boolean; teacherSetupRequired?: boolean };
export type GuardianStudentProfileInput = {
  preferredName: string;
  interests: string;
  strengths: string;
  learningDifficulties: string;
  helpfulNotes: string;
  photoDataUrl: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw Object.assign(new Error("REQUEST_FAILED"), { status: response.status, payload });
  return payload;
}

export async function guardianBackendStatus() { return readJson<GuardianBackendStatus>(await fetch("/api/backend/status", { cache: "no-store" })); }
export async function guardianSearch(query: string) { return readJson<{ students: GuardianSearchStudent[] }>(await fetch("/api/guardian/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) })); }
export async function guardianLogin(studentId: string) { return readJson<{ ok: true; expiresAtMs: number }>(await fetch("/api/guardian/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId }) })); }
export async function guardianMe<T = Record<string, unknown>>() { return readJson<T>(await fetch("/api/guardian/me", { cache: "no-store" })); }
export async function guardianLogout() { return readJson<{ ok: true }>(await fetch("/api/guardian/logout", { method: "POST" })); }
export async function guardianSendMessage(body: string) { return readJson<{ ok: true }>(await fetch("/api/guardian/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) })); }
export async function guardianSendFollowUp(category: FollowUpCategory, statement: string) { return readJson<{ ok: true }>(await fetch("/api/guardian/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, statement }) })); }
export async function guardianSaveProfile(profile: GuardianStudentProfileInput) { return readJson<{ ok: true }>(await fetch("/api/guardian/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) })); }
