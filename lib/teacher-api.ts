"use client";

import type { Message, TaallamtData } from "./types";

export type ContactRequestStatus = "pending" | "approved" | "rejected" | "closed";
export type ContactRequest = {
  studentId: string;
  studentName: string;
  status: ContactRequestStatus;
  reason: string;
  requestedAt: string;
  updatedAt: string;
};
export type GuardianContact = {
  studentId: string;
  guardianName: string;
  guardianPhone: string;
};

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

export async function getTeacherContactRequests() {
  return readJson<{ requests: ContactRequest[] }>(await fetch("/api/teacher/contact-requests", { cache: "no-store" }));
}

export async function setTeacherContactRequest(studentId: string, status: "approved" | "rejected" | "closed") {
  return readJson<{ ok: true; studentId: string; status: ContactRequestStatus }>(await fetch("/api/teacher/contact-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, status }),
  }));
}

export async function getTeacherMessages(studentId?: string) {
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  return readJson<{ messages: Message[] }>(await fetch(`/api/teacher/messages${query}`, { cache: "no-store" }));
}

export async function teacherSendMessage(studentId: string, body: string) {
  return readJson<{ ok: true; message: Message }>(await fetch("/api/teacher/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, body }),
  }));
}

export async function getTeacherStudentContacts() {
  return readJson<{ contacts: GuardianContact[] }>(await fetch("/api/teacher/student-contacts", { cache: "no-store" }));
}

export async function saveTeacherStudentContact(
  studentId: string,
  guardianName: string,
  guardianPhone: string,
  studentName = "",
  className = "",
) {
  return readJson<{ ok: true; contact: GuardianContact }>(await fetch("/api/teacher/student-contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, guardianName, guardianPhone, studentName, className }),
  }));
}

export async function getGuardianShareAccess(studentId: string) {
  const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/guardian-access`, { cache: "no-store" });
  return readJson<{ ok: true; enabled: boolean; shareToken: string | null }>(response);
}

export async function setGuardianAccessCode(
  studentId: string,
  code: string,
  student?: { name?: string; className?: string },
) {
  const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/guardian-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, studentName: student?.name ?? "", className: student?.className ?? "" }),
  });
  return readJson<{ ok: true; shareToken: string }>(response);
}

export async function disableGuardianAccess(studentId: string) {
  const response = await fetch(`/api/teacher/students/${encodeURIComponent(studentId)}/guardian-access`, {
    method: "DELETE",
  });
  return readJson<{ ok: true }>(response);
}
