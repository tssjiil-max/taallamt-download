import type { Student, Subject, Term, SpecialFollowUp } from "./types";

export const terms: Term[] = [
  { id: "term-1", name: "الفصل الدراسي الأول", academicYear: "1448هـ", active: true },
  { id: "term-2", name: "الفصل الدراسي الثاني", academicYear: "1448هـ", active: false },
];

export const subjects: Subject[] = [
  { id: "quran", termId: "term-1", name: "القرآن الكريم", enabled: true, order: 1 },
  { id: "islamic", termId: "term-1", name: "الدراسات الإسلامية", enabled: true, order: 2 },
  { id: "lughati", termId: "term-1", name: "لغتي", enabled: true, order: 3 },
];

export const students: Student[] = [
  { id: "s1", name: "نموذج طالب 1", className: "ثاني/4", active: true, guardianDeviceLimit: 2, guardianDevices: 2, specialFollowUp: true },
  { id: "s2", name: "نموذج طالب 2", className: "ثاني/4", active: true, guardianDeviceLimit: 2, guardianDevices: 1, specialFollowUp: false },
  { id: "s3", name: "نموذج طالب 3", className: "ثاني/4", active: true, guardianDeviceLimit: 2, guardianDevices: 1, specialFollowUp: false },
];

export const specialFollowUp: SpecialFollowUp = {
  studentId: "s1",
  category: "learning",
  guardianStatement: "ذكر ولي الأمر وجود صعوبة مستمرة في القراءة المنزلية.",
  schoolImpact: "بطء في قراءة الكلمات الجديدة والحاجة إلى تكرار أكثر.",
  goal: "تحسين الطلاقة وتقليل التردد في قراءة الكلمات المقررة.",
  plan: [
    "تدريب قصير يومي على مجموعة كلمات محددة.",
    "تقسيم المهمة إلى خطوات صغيرة مع تعزيز فوري.",
    "مراجعة التقدم أسبوعيًا مع ولي الأمر.",
  ],
  status: "needs_review",
  nextReviewAt: "بعد أسبوعين",
};
