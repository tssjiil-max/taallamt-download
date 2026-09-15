import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyAssignments,
  buildWeeklyPlan,
  getWeekStartSunday,
  parseCurriculumContent,
  type AutomationInput,
} from "../lib/learning-automation";

const subjects = [
  { id: "quran", termId: "term-1", name: "القرآن الكريم", enabled: true, order: 1 },
  { id: "islamic", termId: "term-1", name: "الدراسات الإسلامية", enabled: true, order: 2 },
  { id: "lughati", termId: "term-1", name: "لغتي", enabled: true, order: 3 },
  { id: "spelling", termId: "term-1", name: "الإملاء والخط", enabled: true, order: 4 },
];

const weeklyPlans = [
  { id: "quran-w3", termId: "term-1", subjectId: "quran", week: 3, title: "حفظ: سورة الشمس، الآيات 1-8" },
  { id: "islamic-w3", termId: "term-1", subjectId: "islamic", week: 3, title: "أسماء الله وصفاته: الله الرحمن الرحيم" },
  { id: "lughati-w3", termId: "term-1", subjectId: "lughati", week: 3, title: "أقاربي: الدرس الثاني «عذرًا يا جدي»" },
  { id: "spelling-w3", termId: "term-1", subjectId: "spelling", week: 3, title: "أقاربي: اللام الشمسية" },
];

const skills = [
  { id: "quran-w3-m", termId: "term-1", subjectId: "quran", week: 3, category: "الحفظ", title: "يحفظ المقطع المقرر: سورة الشمس، الآيات 1-8", active: true, source: "register" as const },
  { id: "islamic-w3-main", termId: "term-1", subjectId: "islamic", week: 3, category: "التوحيد", title: "يفهم ويطبق ما تعلمه في: أسماء الله وصفاته: الله الرحمن الرحيم", active: true, source: "register" as const },
  { id: "lughati-w3-reading", termId: "term-1", subjectId: "lughati", week: 3, category: "القراءة", title: "يقرأ محتوى الأسبوع قراءة مناسبة لمستواه", active: true, source: "register" as const },
  { id: "lughati-w3-comp", termId: "term-1", subjectId: "lughati", week: 3, category: "الفهم القرائي", title: "يفهم المفردات والأفكار الرئيسة", active: true, source: "register" as const },
  { id: "spelling-w3-d", termId: "term-1", subjectId: "spelling", week: 3, category: "الإملاء", title: "يكتب كلمات تطبق مهارة: اللام الشمسية", active: true, source: "register" as const },
  { id: "spelling-w3-h", termId: "term-1", subjectId: "spelling", week: 3, category: "الخط", title: "يكتب بخط واضح مع مراعاة السطر والمسافات وشكل الحروف", active: true, source: "register" as const },
];

const timetable = {
  الأحد: [
    { subjectId: "quran", period: 1, from: "08:00", to: "08:40" },
    { subjectId: "lughati", period: 2, from: "08:50", to: "09:30" },
    { subjectId: "islamic", period: 3, from: "10:00", to: "10:40" },
    { subjectId: "spelling", period: 4, from: "11:00", to: "11:40" },
  ],
  الاثنين: [],
  الثلاثاء: [],
  الأربعاء: [],
  الخميس: [],
} as AutomationInput["timetable"];

const input: AutomationInput = {
  classId: "ثاني_4",
  termId: "term-1",
  week: 3,
  subjects,
  weeklyPlans,
  skills,
  timetable,
  settings: { autoWeeklyPlan: true, autoDailyAssignments: true, includeQuran: true, includeSkillPractice: true },
};

test("week start is Sunday and Saturday points to the upcoming teaching week", () => {
  assert.equal(getWeekStartSunday("2026-09-15"), "2026-09-13");
  assert.equal(getWeekStartSunday("2026-09-19", true), "2026-09-20");
});

test("parses real curriculum content without inventing a lesson", () => {
  assert.deepEqual(parseCurriculumContent(weeklyPlans[2]), {
    unit: "أقاربي",
    lesson: "الدرس الثاني «عذرًا يا جدي»",
  });
  assert.deepEqual(parseCurriculumContent(weeklyPlans[0]), {
    quranType: "MEMORIZATION",
    surah: "الشمس",
    fromAya: 1,
    toAya: 8,
  });
});

test("weekly plan uses timetable, real distribution and skills", () => {
  const plan = buildWeeklyPlan(input, "2026-09-13");
  const sunday = plan.days.find((day) => day.day === "الأحد");
  assert.ok(sunday);
  assert.equal(sunday.subjects.length, 4);
  assert.equal(sunday.subjects[1].unit, "أقاربي");
  assert.equal(sunday.subjects[1].lesson, "الدرس الثاني «عذرًا يا جدي»");
  assert.equal(sunday.subjects[1].skills[0].category, "القراءة");
  assert.equal(sunday.subjects[3].subject, "الإملاء والخط");
});

test("daily assignments are deterministic, unique and capped at three", () => {
  const first = buildDailyAssignments(input, "2026-09-13");
  const second = buildDailyAssignments(input, "2026-09-13");
  assert.equal(first.length, 3);
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map((task) => task.idempotencyKey)).size, first.length);
  assert.equal(first[0].taskType, "QURAN_MEMORIZATION");
  assert.match(first[0].taskText, /سورة الشمس/);
  assert.equal(first[0].status, "PENDING");
});

test("missing curriculum produces no fabricated assignment", () => {
  const missing: AutomationInput = { ...input, weeklyPlans: weeklyPlans.filter((plan) => plan.subjectId !== "islamic") };
  const tasks = buildDailyAssignments(missing, "2026-09-13");
  assert.equal(tasks.some((task) => task.subjectId === "islamic"), false);
  const week = buildWeeklyPlan(missing, "2026-09-13");
  const islamic = week.days[0].subjects.find((item) => item.subjectId === "islamic");
  assert.equal(islamic?.contentStatus, "INCOMPLETE");
  assert.equal(islamic?.lesson, "المحتوى غير مكتمل");
});

test("spelling and handwriting stay one subject and one task candidate", () => {
  const spellingOnly: AutomationInput = {
    ...input,
    timetable: { ...timetable, الأحد: timetable.الأحد.filter((slot) => slot.subjectId === "spelling") },
  };
  const tasks = buildDailyAssignments(spellingOnly, "2026-09-13");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].subject, "الإملاء والخط");
  assert.equal(tasks[0].taskType, "SPELLING");
  assert.match(tasks[0].skill ?? "", /الإملاء/);
  assert.match(tasks[0].skill ?? "", /الخط/);
});
