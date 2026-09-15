export const TEACHER_ROSTER_SLOT_COUNT = 30;

export type TeacherStudentIdentity = { id: string; name: string };
export type TeacherRosterSlots = Array<string | null>;

const CANONICAL_IDS = [
  "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10",
  "s11", "s12", "s13", "s14", "s15", "s16", "s17", "s18", "s19", "s20",
  "s21", "s23", "s24", "s25", "s26", "s27", "s28", "s29", "s30",
] as const;

const DISPLAY_NAMES: Record<string, string> = {
  s1: "أحمد بسام الأحمد",
  s2: "أسامه سلطان الصاعدي",
  s3: "أمير نايف الحجيلي",
  s4: "أنس أحمد الجهني",
  s5: "أوس نايف الشريف",
  s6: "أويس عادل المالكي",
  s7: "تميم ماجد الحجيلي",
  s8: "ثامر عبدالله العوفي",
  s9: "راكان حاتم الجهني",
  s10: "ريان محمود بري",
  s11: "سلطان فهد الجهني",
  s12: "شامخ بدر الجهني",
  s13: "عادل غالب العنزي",
  s14: "عبدالجليل سالم عبدالجليل",
  s15: "عبدالرحمن نواف الحازمي",
  s16: "عمر حميد العمري",
  s17: "فيصل محمد المطيري",
  s18: "قصي عبدالله الحجيلي",
  s19: "كنان محمد اليوسفي",
  s20: "محمد سماح البوق",
  s21: "محمد صالح عواد",
  s23: "موسى رياض الأحمد",
  s24: "نايف أحمد الجهني",
  s25: "نواف مطلق العمري",
  s26: "الحسن عادل الرجبي",
  s27: "وسام سلطان السناني",
  s28: "يمان أحمد الجهني",
  s29: "يوسف فلاح الحربي",
  s30: "يوسف محمد الجهني",
};

const LEGACY_SHORT_NAMES: Record<string, string> = {
  s10: "ريان محمود باري",
  s16: "عمر حميد العروي",
  s20: "محمد سماح اللوفي",
  s26: "وائل محمد روزي",
};

export function shortStudentName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 3) return parts.join(" ");
  return [parts[0], parts[1], parts[parts.length - 1]].join(" ");
}

export function teacherStudentDisplayName(student: TeacherStudentIdentity) {
  const shortened = shortStudentName(student.name);
  const canonical = DISPLAY_NAMES[student.id];
  if (!canonical) return shortened;
  const legacy = LEGACY_SHORT_NAMES[student.id] ?? canonical;
  return shortened === canonical || shortened === legacy ? canonical : shortened;
}

export function isTeacherRosterExcludedId(id: string) {
  return id === "s22";
}

export function makeInitialTeacherRosterSlots(): TeacherRosterSlots {
  return [...CANONICAL_IDS, null];
}

export function normalizeTeacherRosterSlots(value: unknown): TeacherRosterSlots | null {
  if (!Array.isArray(value) || value.length !== TEACHER_ROSTER_SLOT_COUNT) return null;
  const normalized = value.map((item) => typeof item === "string" && item.trim() ? item : null);
  const ids = normalized.filter((item): item is string => Boolean(item));
  if (new Set(ids).size !== ids.length) return null;
  return normalized;
}

export function removeStudentFromSlots(slots: TeacherRosterSlots, studentId: string) {
  return slots.map((id) => id === studentId ? null : id);
}

export function assignStudentToSlot(slots: TeacherRosterSlots, studentId: string, preferredIndex?: number) {
  if (slots.includes(studentId)) return [...slots];
  const next = [...slots];
  const preferred = typeof preferredIndex === "number" && preferredIndex >= 0 && preferredIndex < TEACHER_ROSTER_SLOT_COUNT
    ? preferredIndex
    : -1;
  const target = preferred >= 0 && next[preferred] === null ? preferred : next.findIndex((id) => id === null);
  if (target >= 0) next[target] = studentId;
  return next;
}
