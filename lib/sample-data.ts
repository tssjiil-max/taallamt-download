import type { Student, Subject, TaallamtData, Term } from "./types";

export const terms: Term[] = [
  { id: "term-1", name: "الفصل الدراسي الأول", academicYear: "1448هـ", active: true },
  { id: "term-2", name: "الفصل الدراسي الثاني", academicYear: "1448هـ", active: false },
];

export const subjects: Subject[] = [
  { id: "quran", termId: "term-1", name: "القرآن الكريم", enabled: true, order: 1 },
  { id: "islamic", termId: "term-1", name: "الدراسات الإسلامية", enabled: true, order: 2 },
  { id: "lughati", termId: "term-1", name: "لغتي", enabled: true, order: 3 },
];

const names = [
  "أحمد بسام صالح الأحمد",
  "أسامه سلطان بن بخيت الصاعدي",
  "أمير نايف عبدالهادي الحجيلي",
  "أنس أحمد عبدالله الجهني",
  "أوس نايف بن حمد الشريف",
  "أويس عادل فيصل المالكي",
  "تميم ماجد جابر الحجيلي",
  "ثامر عبدالله رجاء العوفي",
  "راكان حاتم مهل الجهني",
  "ريان محمود باري",
  "سلطان فهد زعل الجهني",
  "شليخ بدر لافي الجهني",
  "عادل غالب عبدالله العنزي",
  "عبدالجليل سالم محمد عبدالجليل",
  "عبدالرحمن نواف هندي الحازمي",
  "عمر حميد بن سليم العروي",
  "فيصل محمد عويض المطيري",
  "قصي عبدالله ظاهر الحجيلي",
  "كنان محمد عبدالعزيز اليوسفي",
  "محمد سماح سعد اللوفي",
  "محمد صلاح حمد عواد",
  "موسى ريض صالح الأحمد",
  "نايف أحمد صوير الجهني",
  "نواف مطلق صلاح العمري",
  "وائل محمد حسين روزي",
  "وسام سلطان عبيد السندي",
  "وليد عطاف علي العمري",
  "يمان أحمد بن عايد الجهني",
  "يوسف فلاح خلف الحربي",
  "يوسف محمد لافي الجهني",
];

export const students: Student[] = names.map((name, index) => ({
  id: `s${index + 1}`,
  name,
  className: "ثاني/4",
  active: true,
  guardianDeviceLimit: 2,
  guardianDevices: 0,
  specialFollowUp: false,
  subjectLevels: {},
}));

export const initialData: TaallamtData = {
  terms,
  subjects,
  students,
  followUps: {},
  messages: [],
};
