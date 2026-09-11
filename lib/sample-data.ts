import type { Skill, SpellingPractice, Student, Subject, TaallamtData, Term, ValueTarget, WeeklyPlan } from "./types";

export const terms: Term[] = [
  { id: "term-1", name: "الفصل الدراسي الأول", academicYear: "1448هـ", active: true },
  { id: "term-2", name: "الفصل الدراسي الثاني", academicYear: "1448هـ", active: false },
];

export const subjects: Subject[] = [
  { id: "quran", termId: "term-1", name: "القرآن الكريم", enabled: true, order: 1 },
  { id: "islamic", termId: "term-1", name: "الدراسات الإسلامية", enabled: true, order: 2 },
  { id: "lughati", termId: "term-1", name: "لغتي", enabled: true, order: 3 },
  { id: "spelling", termId: "term-1", name: "الإملاء والخط", enabled: true, order: 4 },
];

const names = [
  "أحمد بسام صالح الأحمد", "أسامه سلطان بن بخيت الصاعدي", "أمير نايف عبدالهادي الحجيلي", "أنس أحمد عبدالله الجهني", "أوس نايف بن حمد الشريف",
  "أويس عادل فيصل المالكي", "تميم ماجد جابر الحجيلي", "ثامر عبدالله رجاء العوفي", "راكان حاتم مهل الجهني", "ريان محمود باري",
  "سلطان فهد زعل الجهني", "شامخ بدر لافي الجهني", "عادل غالب عبدالله العنزي", "عبدالجليل سالم محمد عبدالجليل", "عبدالرحمن نواف هندي الحازمي",
  "عمر حميد بن سليم العروي", "فيصل محمد عويض المطيري", "قصي عبدالله ظاهر الحجيلي", "كنان محمد عبدالعزيز اليوسفي", "محمد سماح سعد اللوفي",
  "محمد صالح حمد عواد", "معن أيمن صلاح الأحمدي", "موسى رياض صالح الأحمد", "نايف أحمد صوير الجهني", "نواف مطلق صالح العمري",
  "وائل محمد حسين روزي", "وسام سلطان عبيد السناني", "يمان أحمد بن عايد الجهني", "يوسف فلاح خلف الحربي", "يوسف محمد لافي الجهني",
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

const spelling = [
  "أقاربي: مراجعة الحركات القصيرة والسكون", "أقاربي: اللام القمرية", "أقاربي: اللام الشمسية", "أقاربي: مراجعة اللام الشمسية والقمرية",
  "أقاربي: تنوين الضم", "أقاربي: تنوين الفتح", "أصدقائي وجيراني: تنوين الكسر", "أصدقائي وجيراني: التضعيف (الشدة)",
  "أصدقائي وجيراني: الشدة مع اللام الشمسية", "أصدقائي وجيراني: مراجعة التنوين والشدة", "وطني السعودية: التاء المربوطة",
  "وطني السعودية: التنوين مع التاء المربوطة", "وطني السعودية: المد بالألف", "وطني السعودية: المد بالواو",
  "محاصيل من بلادي: المد بالياء", "محاصيل من بلادي: مراجعة المدود الثلاثة", "محاصيل من بلادي: مراجعة شاملة",
];

export const weeklyPlans: WeeklyPlan[] = [...plans("quran", quran), ...plans("islamic", islamic), ...plans("lughati", lughati), ...plans("spelling", spelling)];

function skill(subjectId: string, week: number, category: string, title: string, suffix: string): Skill {
  return { id: `${subjectId}-w${week}-${suffix}`, termId: "term-1", subjectId, week, category, title, active: true, source: "register" };
}

const quranSkills: Skill[] = quran.flatMap((title, index) => {
  const week = index + 1;
  const target = title.replace(/^حفظ:\s*/, "");
  if (title.includes("مراجعة")) return [
    skill("quran", week, "الحفظ", "يثبت الحفظ السابق ويستظهره دون تردد قدر الإمكان", "memorization"),
    skill("quran", week, "التلاوة والمراجعة", "يراجع السور السابقة بتلاوة صحيحة وواضحة", "recitation"),
  ];
  return [
    skill("quran", week, "الحفظ", `يحفظ المقطع المقرر: ${target}`, "memorization"),
    skill("quran", week, "التلاوة", `يتلو المقطع المقرر تلاوة صحيحة: ${target}`, "recitation"),
  ];
});

function islamicCategory(title: string) { return /(الله|العبادة|الشرك|خلقنا)/.test(title) ? "التوحيد" : "الفقه والسلوك"; }
const islamicSkills: Skill[] = islamic.map((title, index) => skill("islamic", index + 1, islamicCategory(title), `يفهم ويطبق ما تعلمه في: ${title}`, "main"));

const lughatiSkills: Skill[] = lughati.flatMap((title, index) => {
  const week = index + 1;
  return [
    skill("lughati", week, "الاستماع والتحدث", `يستمع ويتحدث حول محتوى الأسبوع: ${title}`, "listening-speaking"),
    skill("lughati", week, "القراءة", `يقرأ محتوى الأسبوع قراءة مناسبة لمستواه: ${title}`, "reading"),
    skill("lughati", week, "الفهم القرائي", `يفهم المفردات والأفكار الرئيسة في: ${title}`, "comprehension"),
    skill("lughati", week, "الكتابة والإملاء", `يكتب ويملي الكلمات والتراكيب المستهدفة في: ${title}`, "writing"),
    skill("lughati", week, "التراكيب اللغوية", `يطبق التراكيب والظواهر اللغوية المرتبطة بـ: ${title}`, "language"),
  ];
});

const spellingSkills: Skill[] = spelling.flatMap((title, index) => {
  const week = index + 1;
  const skillName = title.split(": ").slice(1).join(": ");
  return [
  skill("spelling", week, "الإملاء", `يكتب كلمات تطبق مهارة: ${skillName}`, "dictation"),
  skill("spelling", week, "الخط", "يكتب بخط واضح مع مراعاة السطر والمسافات وشكل الحروف", "handwriting"),
  ];
});

export const skills: Skill[] = [...quranSkills, ...islamicSkills, ...lughatiSkills, ...spellingSkills];

export const values: ValueTarget[] = [
  { id: "value-family-ties", termId: "term-1", unitName: "أقاربي", title: "صلة الرحم", studentText: "أحترم أقاربي وأسأل عنهم وأعامل كبار الأسرة بلطف.", homeSuggestion: "شجّعه على السلام على قريب أو مساعدته أو السؤال عنه.", weekFrom: 1, weekTo: 4, active: true, source: "teacher" },
  { id: "value-communication", termId: "term-1", unitName: "أصدقائي وجيراني", title: "التواصل مع الآخرين", studentText: "أستمع لمن يحدثني وأتحدث بلطف ووضوح.", homeSuggestion: "اطلب منه أن يحكي موقفًا قصيرًا ويستمع للآخر دون مقاطعة.", weekFrom: 5, weekTo: 8, active: true, source: "unit_guide" },
  { id: "value-smile", termId: "term-1", unitName: "أصدقائي وجيراني", title: "الابتسامة وحب الآخرين", studentText: "أبتسم وأسلم وأعامل زملائي بلطف.", homeSuggestion: "عزز السلام والابتسامة والكلمة الطيبة في البيت.", weekFrom: 5, weekTo: 8, active: true, source: "unit_guide" },
  { id: "value-responsibility", termId: "term-1", unitName: "أصدقائي وجيراني", title: "المسؤولية", studentText: "أنجز مهمتي وأحافظ على أدواتي ومكاني.", homeSuggestion: "أعطه مسؤولية منزلية صغيرة وثابتة ثم امدح التزامه بها.", weekFrom: 5, weekTo: 8, active: true, source: "unit_guide" },
  { id: "value-cooperation", termId: "term-1", unitName: "أصدقائي وجيراني", title: "التعاون", studentText: "أساعد زملائي وأعمل معهم بروح جميلة.", homeSuggestion: "اجعله يشارك أحد أفراد الأسرة في مهمة قصيرة.", weekFrom: 5, weekTo: 8, active: true, source: "unit_guide" },
  { id: "value-social", termId: "term-1", unitName: "أصدقائي وجيراني", title: "المشاركة الاجتماعية", studentText: "أشارك في أعمال الصف والأنشطة المفيدة.", homeSuggestion: "شجعه على المشاركة في عمل أسري أو اجتماعي مناسب لعمره.", weekFrom: 5, weekTo: 8, active: true, source: "unit_guide" },
  { id: "value-patriotism", termId: "term-1", unitName: "وطني السعودية", title: "الانتماء والمحافظة", studentText: "أحب وطني وأحافظ على المدرسة والمرافق العامة.", homeSuggestion: "اربط حب الوطن بالمحافظة على النظافة والممتلكات العامة.", weekFrom: 9, weekTo: 12, active: true, source: "teacher" },
  { id: "value-gratitude", termId: "term-1", unitName: "محاصيل من بلادي", title: "شكر النعمة والعمل", studentText: "أشكر الله على النعم وأقدر عمل من ينتج لنا الغذاء.", homeSuggestion: "تحدث معه عن عدم الإسراف وشكر النعمة وتقدير العاملين.", weekFrom: 13, weekTo: 17, active: true, source: "teacher" },
];

const handwritingChecklist = ["جلسة صحيحة ومسك القلم برفق", "استقرار الحروف على السطور الأربعة", "حجم حروف متقارب", "مسافات مناسبة بين الكلمات", "اتجاه كتابة صحيح من اليمين إلى اليسار"];
const spellingRows = [
  [1, "أقاربي", "مراجعة الحركات القصيرة والسكون"],
  [2, "أقاربي", "اللام القمرية"],
  [3, "أقاربي", "اللام الشمسية"],
  [4, "أقاربي", "مراجعة اللام الشمسية والقمرية"],
  [5, "أقاربي", "تنوين الضم"],
  [6, "أقاربي", "تنوين الفتح"],
  [7, "أصدقائي وجيراني", "تنوين الكسر"],
  [8, "أصدقائي وجيراني", "التضعيف (الشدة)"],
  [9, "أصدقائي وجيراني", "الشدة مع اللام الشمسية"],
  [10, "أصدقائي وجيراني", "مراجعة التنوين والشدة"],
  [11, "وطني السعودية", "التاء المربوطة"],
  [12, "وطني السعودية", "التنوين مع التاء المربوطة"],
  [13, "وطني السعودية", "المد بالألف"],
  [14, "وطني السعودية", "المد بالواو"],
  [15, "محاصيل من بلادي", "المد بالياء"],
  [16, "محاصيل من بلادي", "مراجعة المدود الثلاثة"],
  [17, "محاصيل من بلادي", "مراجعة شاملة على مهارات الفصل"],
] as const;

export const spellingPractices: SpellingPractice[] = spellingRows.map(([week, unitName, skillName]) => ({
  id: `spelling-w${week}`,
  termId: "term-1",
  week,
  unitName,
  skill: skillName,
  scoreTotal: 10,
  handwritingChecklist,
  active: true,
}));

export const initialData: TaallamtData = {
  terms,
  subjects,
  students,
  weeklyPlans,
  skills,
  assessments: [],
  resources: [],
  values,
  valueStars: [],
  behaviorEvaluations: [],
  spellingPractices,
  followUps: {},
  messages: [],
};
