import type { Skill, Student, Subject, TaallamtData, Term, WeeklyPlan } from "./types";

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
  "أحمد بسام صالح الأحمد", "أسامه سلطان بن بخيت الصاعدي", "أمير نايف عبدالهادي الحجيلي", "أنس أحمد عبدالله الجهني", "أوس نايف بن حمد الشريف",
  "أويس عادل فيصل المالكي", "تميم ماجد جابر الحجيلي", "ثامر عبدالله رجاء العوفي", "راكان حاتم مهل الجهني", "ريان محمود باري",
  "سلطان فهد زعل الجهني", "شليخ بدر لافي الجهني", "عادل غالب عبدالله العنزي", "عبدالجليل سالم محمد عبدالجليل", "عبدالرحمن نواف هندي الحازمي",
  "عمر حميد بن سليم العروي", "فيصل محمد عويض المطيري", "قصي عبدالله ظاهر الحجيلي", "كنان محمد عبدالعزيز اليوسفي", "محمد سماح سعد اللوفي",
  "محمد صلاح حمد عواد", "موسى ريض صالح الأحمد", "نايف أحمد صوير الجهني", "نواف مطلق صلاح العمري", "وائل محمد حسين روزي",
  "وسام سلطان عبيد السندي", "وليد عطاف علي العمري", "يمان أحمد بن عايد الجهني", "يوسف فلاح خلف الحربي", "يوسف محمد لافي الجهني",
];

export const students: Student[] = names.map((name, index) => ({
  id: `s${index + 1}`, name, className: "ثاني/4", active: true,
  guardianDeviceLimit: 2, guardianDevices: 0, specialFollowUp: false, subjectLevels: {},
}));

const quran = [
  "حفظ: سورة الليل، الآيات 1-11", "حفظ: سورة الليل، الآيات 12-21", "حفظ: سورة الشمس، الآيات 1-8", "حفظ: سورة الشمس، الآيات 9-15",
  "حفظ: سورة البلد، الآيات 1-10", "حفظ: سورة البلد، الآيات 11-20", "حفظ: سورة الفجر، الآيات 1-15", "حفظ: سورة الفجر، الآيات 16-30",
  "حفظ: سورة الغاشية، الآيات 1-13", "حفظ: سورة الغاشية، الآيات 14-26", "حفظ: سورة الأعلى، الآيات 1-10", "حفظ: سورة الأعلى، الآيات 11-19",
  "حفظ: سورة الطارق، الآيات 1-9", "حفظ: سورة الطارق، الآيات 10-17", "حفظ: سورة البروج، الآيات 1-11", "حفظ: سورة البروج، الآيات 12-22", "مراجعة عامة وتثبيت الحفظ",
];

const islamic = [
  "أسماء الله وصفاته: الله الواحد", "التعامل مع الناس: الآداب (1)", "أسماء الله وصفاته: الله الرحمن الرحيم + التعامل مع الناس: الآداب (2)", "التعامل مع الناس: الآداب (3) + مراجعة",
  "أسماء الله وصفاته: الله السميع البصير", "العبادة وما يضادها من الشرك: لماذا خلقنا الله؟ + أذكار الصباح والمساء", "الأذكار والأدعية: أذكار العطاس والنوم", "آداب النظافة: نظافة البدن",
  "العبادة وما يضادها من الشرك: العبادة", "آداب النظافة: نظافة الملابس والمكان", "العبادة: عبادة الله وحده + آداب الأكل والشرب (1)", "آداب الأكل والشرب (2)",
  "عبادة غير الله شرك + المحافظة على الممتلكات الخاصة وحقوق الآخرين", "المحافظة على البيئة", "المحافظة على الممتلكات العامة", "مراجعة الدروس وتثبيت التعلم", "مراجعة عامة",
];

const lughati = [
  "أقاربي: نشاطات التهيئة", "أقاربي: الدرس الأول «صلة الرحم»", "أقاربي: الدرس الثاني «عذرًا يا جدي»", "مراجعة",
  "أصدقائي وجيراني: نشاطات التهيئة", "أصدقائي وجيراني: الدرس الأول «الصديقان»", "أصدقائي وجيراني: الدرس الثاني «الجار الصغير»", "مراجعة",
  "وطني السعودية: نشاطات التهيئة", "وطني السعودية: الدرس الأول «مدينتان مقدستان»", "وطني السعودية: الدرس الثاني «علم بلادي»", "مراجعة",
  "محاصيل من بلادي: نشاطات التهيئة", "محاصيل من بلادي: الدرس الأول «رحلة حبة قمح»", "محاصيل من بلادي: الدرس الثاني «من أنا؟»", "محاصيل من بلادي: استكمال الدرس الثاني «من أنا؟»", "مراجعة عامة",
];

function plans(subjectId: string, titles: string[]): WeeklyPlan[] {
  return titles.map((title, index) => ({ id: `${subjectId}-w${index + 1}`, termId: "term-1", subjectId, week: index + 1, title }));
}

export const weeklyPlans: WeeklyPlan[] = [...plans("quran", quran), ...plans("islamic", islamic), ...plans("lughati", lughati)];

function skill(subjectId: string, week: number, category: string, title: string, suffix: string): Skill {
  return {
    id: `${subjectId}-w${week}-${suffix}`,
    termId: "term-1",
    subjectId,
    week,
    category,
    title,
    active: true,
    source: "register",
  };
}

const quranSkills: Skill[] = quran.flatMap((title, index) => {
  const week = index + 1;
  const target = title.replace(/^حفظ:\s*/, "");
  if (title.includes("مراجعة")) {
    return [
      skill("quran", week, "الحفظ", "يثبت الحفظ السابق ويستظهره دون تردد قدر الإمكان", "memorization"),
      skill("quran", week, "التلاوة والمراجعة", "يراجع السور السابقة بتلاوة صحيحة وواضحة", "recitation"),
    ];
  }
  return [
    skill("quran", week, "الحفظ", `يحفظ المقطع المقرر: ${target}`, "memorization"),
    skill("quran", week, "التلاوة", `يتلو المقطع المقرر تلاوة صحيحة: ${target}`, "recitation"),
  ];
});

function islamicCategory(title: string) {
  return /(الله|العبادة|الشرك|خلقنا)/.test(title) ? "التوحيد" : "الفقه والسلوك";
}

const islamicSkills: Skill[] = islamic.map((title, index) => {
  const week = index + 1;
  const category = islamicCategory(title);
  return skill("islamic", week, category, `يفهم ويطبق ما تعلمه في: ${title}`, "main");
});

const lughatiSkills: Skill[] = lughati.flatMap((title, index) => {
  const week = index + 1;
  return [
    skill("lughati", week, "القراءة", `يقرأ محتوى الأسبوع قراءة مناسبة لمستواه: ${title}`, "reading"),
    skill("lughati", week, "الفهم القرائي", `يفهم المفردات والأفكار الرئيسة في: ${title}`, "comprehension"),
    skill("lughati", week, "الكتابة والإملاء", `يكتب ويملي الكلمات والتراكيب المستهدفة في: ${title}`, "writing"),
    skill("lughati", week, "المهارات اللغوية", `يطبق المهارات اللغوية المرتبطة بـ: ${title}`, "language"),
  ];
});

export const skills: Skill[] = [...quranSkills, ...islamicSkills, ...lughatiSkills];

export const initialData: TaallamtData = {
  terms,
  subjects,
  students,
  weeklyPlans,
  skills,
  assessments: [],
  followUps: {},
  messages: [],
};
