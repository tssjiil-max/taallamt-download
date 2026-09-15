import type { Skill, Subject, WeeklyPlan } from "./types";

export const SCHOOL_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;
export type SchoolDay = (typeof SCHOOL_DAYS)[number];
export type TaskType =
  | "HOMEWORK"
  | "SKILL_PRACTICE"
  | "QURAN_MEMORIZATION"
  | "QURAN_REVIEW"
  | "ISLAMIC_STUDIES"
  | "SPELLING"
  | "HANDWRITING"
  | "REVIEW";
export type LearningSource = "AUTO" | "MANUAL";
export type AssignmentStatus = "PENDING" | "COMPLETED";

export type AutomationSettings = {
  autoWeeklyPlan: boolean;
  autoDailyAssignments: boolean;
  includeQuran: boolean;
  includeSkillPractice: boolean;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  autoWeeklyPlan: true,
  autoDailyAssignments: true,
  includeQuran: true,
  includeSkillPractice: true,
};

export type TimetableSlot = {
  subjectId: string;
  period: number;
  from?: string;
  to?: string;
  includedSubjectIds?: string[];
};
export type ClassTimetable = Record<SchoolDay, TimetableSlot[]>;

export type AutomationInput = {
  classId: string;
  termId: string;
  week: number;
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  timetable: ClassTimetable;
  settings: AutomationSettings;
};

export type ParsedCurriculumContent = {
  unit?: string;
  lesson?: string;
  quranType?: "MEMORIZATION" | "REVIEW";
  surah?: string;
  fromAya?: number;
  toAya?: number;
};

export type WeeklySubjectItem = {
  id: string;
  date: string;
  day: SchoolDay;
  subjectId: string;
  subject: string;
  unit?: string;
  lesson: string;
  skills: Skill[];
  surah?: string;
  fromAya?: number;
  toAya?: number;
  quranType?: "MEMORIZATION" | "REVIEW";
  expectedTask?: string;
  contentStatus: "READY" | "INCOMPLETE";
  source: LearningSource;
};

export type WeeklyPlanSnapshot = {
  classId: string;
  termId: string;
  week: number;
  weekStart: string;
  days: Array<{ date: string; day: SchoolDay; subjects: WeeklySubjectItem[] }>;
};

export type DailyAssignment = {
  id: string;
  idempotencyKey: string;
  date: string;
  subjectId: string;
  subject: string;
  lessonId: string;
  lesson: string;
  skill?: string;
  taskType: TaskType;
  taskText: string;
  status: AssignmentStatus;
  source: LearningSource;
};

const ARABIC_DAY_BY_UTC = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] as const;

function dateFromKey(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date key: ${dateKey}`);
  return date;
}

export function addDays(dateKey: string, days: number) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayNameForDateKey(dateKey: string) {
  return ARABIC_DAY_BY_UTC[dateFromKey(dateKey).getUTCDay()];
}

export function getWeekStartSunday(dateKey: string, upcomingIfSaturday = false) {
  const date = dateFromKey(dateKey);
  const dayIndex = date.getUTCDay();
  if (upcomingIfSaturday && dayIndex === 6) return addDays(dateKey, 1);
  return addDays(dateKey, -dayIndex);
}

export function parseCurriculumContent(plan: WeeklyPlan): ParsedCurriculumContent {
  const title = plan.title.trim();
  if (plan.subjectId === "quran") {
    const memorization = title.match(/حفظ\s*:\s*سورة\s+([^،]+)\s*،?\s*الآيات\s*(\d+)\s*[-–—]\s*(\d+)/);
    if (memorization) {
      return {
        quranType: "MEMORIZATION",
        surah: memorization[1].trim(),
        fromAya: Number(memorization[2]),
        toAya: Number(memorization[3]),
      };
    }
    if (/مراجعة/.test(title)) {
      const surah = title.match(/سورة\s+([^،]+)/)?.[1]?.trim();
      return { quranType: "REVIEW", ...(surah ? { surah } : {}) };
    }
    return {};
  }

  const colon = title.indexOf(":");
  if (colon < 0) return { lesson: title || undefined };
  const unit = title.slice(0, colon).trim();
  const lesson = title.slice(colon + 1).trim();
  return {
    ...(unit ? { unit } : {}),
    ...(lesson ? { lesson } : {}),
  };
}

function uniqueSkills(skills: Skill[]) {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = `${skill.category}\u0000${skill.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function skillsFor(input: AutomationInput, subjectId: string) {
  return uniqueSkills(
    input.skills.filter(
      (skill) =>
        skill.active !== false &&
        skill.termId === input.termId &&
        skill.subjectId === subjectId &&
        skill.week === input.week,
    ),
  );
}

function subjectFor(input: AutomationInput, subjectId: string) {
  return input.subjects.find(
    (subject) => subject.id === subjectId && subject.termId === input.termId && subject.enabled !== false,
  );
}

function planFor(input: AutomationInput, subjectId: string) {
  return input.weeklyPlans.find(
    (plan) => plan.termId === input.termId && plan.subjectId === subjectId && plan.week === input.week,
  );
}

function quranRangeForDay(parsed: ParsedCurriculumContent, day: SchoolDay) {
  if (parsed.quranType !== "MEMORIZATION" || !parsed.fromAya || !parsed.toAya) return undefined;
  const index = SCHOOL_DAYS.indexOf(day);
  if (index < 0) return undefined;
  const count = parsed.toAya - parsed.fromAya + 1;
  if (count <= 0) return undefined;
  const base = Math.floor(count / SCHOOL_DAYS.length);
  const extra = count % SCHOOL_DAYS.length;
  const size = base + (index < extra ? 1 : 0);
  if (size <= 0) return undefined;
  const offset = index * base + Math.min(index, extra);
  const fromAya = parsed.fromAya + offset;
  return { fromAya, toAya: fromAya + size - 1 };
}

function itemForSlot(input: AutomationInput, dateKey: string, day: SchoolDay, slot: TimetableSlot): WeeklySubjectItem | null {
  const subject = subjectFor(input, slot.subjectId);
  if (!subject) return null;
  const plan = planFor(input, slot.subjectId);
  const skillList = skillsFor(input, slot.subjectId);

  if (!plan) {
    return {
      id: `${dateKey}|${slot.subjectId}|missing`,
      date: dateKey,
      day,
      subjectId: slot.subjectId,
      subject: subject.name,
      lesson: "المحتوى غير مكتمل",
      skills: skillList,
      contentStatus: "INCOMPLETE",
      source: "AUTO",
    };
  }

  const parsed = parseCurriculumContent(plan);
  if (slot.subjectId === "quran") {
    if (!parsed.quranType) {
      return {
        id: `${dateKey}|${plan.id}`,
        date: dateKey,
        day,
        subjectId: slot.subjectId,
        subject: subject.name,
        lesson: "المحتوى غير مكتمل",
        skills: skillList,
        contentStatus: "INCOMPLETE",
        source: "AUTO",
      };
    }
    const range = quranRangeForDay(parsed, day);
    const lesson = parsed.quranType === "REVIEW"
      ? plan.title
      : parsed.surah && range
        ? `سورة ${parsed.surah} — الآيات ${range.fromAya}–${range.toAya}`
        : "المحتوى غير مكتمل";
    return {
      id: `${dateKey}|${plan.id}`,
      date: dateKey,
      day,
      subjectId: slot.subjectId,
      subject: subject.name,
      lesson,
      skills: skillList,
      surah: parsed.surah,
      fromAya: range?.fromAya,
      toAya: range?.toAya,
      quranType: parsed.quranType,
      contentStatus: lesson === "المحتوى غير مكتمل" ? "INCOMPLETE" : "READY",
      source: "AUTO",
    };
  }

  const lesson = parsed.lesson || plan.title.trim();
  if (!lesson) {
    return {
      id: `${dateKey}|${plan.id}`,
      date: dateKey,
      day,
      subjectId: slot.subjectId,
      subject: subject.name,
      lesson: "المحتوى غير مكتمل",
      skills: skillList,
      contentStatus: "INCOMPLETE",
      source: "AUTO",
    };
  }

  return {
    id: `${dateKey}|${plan.id}`,
    date: dateKey,
    day,
    subjectId: slot.subjectId,
    subject: subject.name,
    unit: parsed.unit,
    lesson,
    skills: skillList,
    contentStatus: "READY",
    source: "AUTO",
  };
}

function taskForItem(input: AutomationInput, item: WeeklySubjectItem): DailyAssignment | null {
  if (item.contentStatus !== "READY") return null;
  const plan = planFor(input, item.subjectId);
  if (!plan) return null;
  const categories = Array.from(new Set(item.skills.map((skill) => skill.category))).filter(Boolean);
  let taskType: TaskType;
  let taskText: string;
  let skill: string | undefined;

  switch (item.subjectId) {
    case "quran":
      if (!input.settings.includeQuran) return null;
      if (item.quranType === "MEMORIZATION" && item.surah && item.fromAya && item.toAya) {
        taskType = "QURAN_MEMORIZATION";
        taskText = `حفظ سورة ${item.surah} — الآيات ${item.fromAya}–${item.toAya}`;
      } else if (item.quranType === "REVIEW") {
        taskType = "QURAN_REVIEW";
        taskText = item.lesson;
      } else {
        return null;
      }
      skill = categories.join(" · ") || undefined;
      break;
    case "lughati":
      skill = input.settings.includeSkillPractice ? categories.slice(0, 2).join(" · ") || undefined : undefined;
      taskType = skill ? "SKILL_PRACTICE" : "HOMEWORK";
      taskText = skill ? `تدريب على ${item.lesson} — ${skill}` : `مراجعة ${item.lesson}`;
      break;
    case "islamic":
      skill = categories.slice(0, 1).join(" · ") || undefined;
      taskType = "ISLAMIC_STUDIES";
      taskText = skill ? `مراجعة ${item.lesson} — ${skill}` : `مراجعة ${item.lesson}`;
      break;
    case "spelling":
      skill = categories.join(" · ") || undefined;
      taskType = "SPELLING";
      taskText = `تدريب الإملاء والخط: ${item.lesson}`;
      break;
    default:
      return null;
  }

  const idempotencyKey = `${input.classId}|${item.date}|${item.subjectId}|${taskType}|${plan.id}`;
  return {
    id: `${item.subjectId}|${taskType}|${plan.id}`,
    idempotencyKey,
    date: item.date,
    subjectId: item.subjectId,
    subject: item.subject,
    lessonId: plan.id,
    lesson: item.lesson,
    skill,
    taskType,
    taskText,
    status: "PENDING",
    source: "AUTO",
  };
}

function expandIncludedSlots(slots: TimetableSlot[]) {
  return [...slots]
    .sort((a, b) => a.period - b.period)
    .flatMap((slot) => {
      const subjectIds = slot.includedSubjectIds?.length ? slot.includedSubjectIds : [slot.subjectId];
      return subjectIds.map((subjectId) => ({ ...slot, subjectId, includedSubjectIds: undefined }));
    });
}

function uniqueSlots(slots: TimetableSlot[]) {
  const seen = new Set<string>();
  return expandIncludedSlots(slots).filter((slot) => {
    if (seen.has(slot.subjectId)) return false;
    seen.add(slot.subjectId);
    return true;
  });
}

export function getTeachingContextForDate(input: AutomationInput, dateKey: string) {
  const dayName = dayNameForDateKey(dateKey);
  if (!SCHOOL_DAYS.includes(dayName as SchoolDay)) return null;
  const day = dayName as SchoolDay;
  const subjects = uniqueSlots(input.timetable[day] ?? [])
    .map((slot) => itemForSlot(input, dateKey, day, slot))
    .filter((item): item is WeeklySubjectItem => Boolean(item));
  return { date: dateKey, day, subjects };
}

export function getNextLesson(input: AutomationInput, subjectId: string) {
  return planFor(input, subjectId) ?? null;
}

export function getLessonSkills(input: AutomationInput, subjectId: string) {
  return skillsFor(input, subjectId);
}

export function buildWeeklyPlan(input: AutomationInput, weekStart: string): WeeklyPlanSnapshot {
  const days = SCHOOL_DAYS.map((day, index) => {
    const date = addDays(weekStart, index);
    const context = getTeachingContextForDate(input, date);
    const subjects = context?.subjects ?? [];
    return {
      date,
      day,
      subjects: subjects.map((item) => {
        const expected = taskForItem(input, item);
        return { ...item, expectedTask: expected?.taskText };
      }),
    };
  });
  return { classId: input.classId, termId: input.termId, week: input.week, weekStart, days };
}

export function buildDailyAssignments(input: AutomationInput, dateKey: string): DailyAssignment[] {
  if (!input.settings.autoDailyAssignments) return [];
  const context = getTeachingContextForDate(input, dateKey);
  if (!context) return [];
  const seen = new Set<string>();
  const tasks: DailyAssignment[] = [];
  for (const item of context.subjects) {
    const task = taskForItem(input, item);
    if (!task || seen.has(task.idempotencyKey)) continue;
    seen.add(task.idempotencyKey);
    tasks.push(task);
    if (tasks.length === 3) break;
  }
  return tasks;
}
