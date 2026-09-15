import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  SCHOOL_DAYS,
  addDays,
  buildDailyAssignments,
  buildWeeklyPlan,
  dayNameForDateKey,
  getTeachingContextForDate,
  getWeekStartSunday,
  type AutomationInput,
  type AutomationSettings,
  type ClassTimetable,
  type DailyAssignment,
  type SchoolDay,
  type WeeklyPlanSnapshot,
} from "../learning-automation";
import { academicWeek, RIYADH_TZ } from "../schedule";
import type { Skill, Subject, WeeklyPlan } from "../types";
import { firestoreCollectionName, getAdminDb } from "./firebase-admin";

const CORE_SUBJECT_IDS = new Set(["lughati", "quran", "islamic", "spelling"]);
const AUTOMATION_COLLECTION = "learningAutomation";

const EXISTING_DAY_SLOTS = [
  { subjectId: "quran", period: 1, from: "08:00", to: "08:40" },
  { subjectId: "lughati", period: 2, from: "08:50", to: "09:30" },
  { subjectId: "islamic", period: 3, from: "10:00", to: "10:40" },
  { subjectId: "spelling", period: 4, from: "11:00", to: "11:40" },
];

export const EXISTING_CLASS_TIMETABLE: ClassTimetable = Object.fromEntries(
  SCHOOL_DAYS.map((day) => [day, EXISTING_DAY_SLOTS.map((slot) => ({ ...slot }))]),
) as ClassTimetable;

export type PersistedDailyTask = DailyAssignment & { completedStudentIds: string[] };

type PersistedWeekly = WeeklyPlanSnapshot & {
  kind: "WEEKLY_PLAN";
  source: "AUTO" | "MANUAL";
  published: boolean;
  generatedAt: string;
  updatedAt: string;
  hasManualOverrides?: boolean;
};

type PersistedDaily = {
  kind: "DAILY_ASSIGNMENTS";
  classId: string;
  className: string;
  termId: string;
  week: number;
  date: string;
  source: "AUTO" | "MANUAL";
  published: boolean;
  generatedAt: string;
  updatedAt: string;
  tasks: PersistedDailyTask[];
  incompleteSubjects: string[];
};

type SourceBundle = {
  input: AutomationInput;
  className: string;
  classKey: string;
  studentIds: string[];
  studentNames: Map<string, string>;
  settings: AutomationSettings;
  weekStart: string;
};

type LooseDoc = { id: string } & Record<string, unknown>;

function docsWithIds(docs: QueryDocumentSnapshot[]): LooseDoc[] {
  return docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
}

function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeClassKey(value: string) {
  return value.normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "") || "class";
}

function weeklyDocId(classKey: string, weekStart: string) {
  return `weekly__${classKey}__${weekStart}`;
}

function dailyDocId(classKey: string, dateKey: string) {
  return `daily__${classKey}__${dateKey}`;
}

function settingsDocId(classKey: string) {
  return `settings__${classKey}`;
}

export function riyadhDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function dateForKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("INVALID_DATE");
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  return date;
}

function mostCommonClass(students: LooseDoc[]) {
  const counts = new Map<string, number>();
  for (const student of students) {
    const className = String(student.className ?? "").trim();
    if (!className) continue;
    counts.set(className, (counts.get(className) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))[0]?.[0] ?? "";
}

function asSubject(doc: LooseDoc): Subject | null {
  if (!CORE_SUBJECT_IDS.has(doc.id)) return null;
  const termId = String(doc.termId ?? "");
  const name = String(doc.name ?? "");
  if (!termId || !name) return null;
  return {
    id: doc.id,
    termId,
    name,
    enabled: doc.enabled !== false,
    order: Number(doc.order ?? 0),
  };
}

function asWeeklyPlan(doc: LooseDoc): WeeklyPlan | null {
  const termId = String(doc.termId ?? "");
  const subjectId = String(doc.subjectId ?? "");
  const title = String(doc.title ?? "").trim();
  const week = Number(doc.week ?? 0);
  if (!termId || !CORE_SUBJECT_IDS.has(subjectId) || !title || !Number.isFinite(week)) return null;
  return { id: doc.id, termId, subjectId, week, title };
}

function asSkill(doc: LooseDoc): Skill | null {
  const termId = String(doc.termId ?? "");
  const subjectId = String(doc.subjectId ?? "");
  const category = String(doc.category ?? "").trim();
  const title = String(doc.title ?? "").trim();
  const week = Number(doc.week ?? 0);
  const source = doc.source === "curriculum" || doc.source === "teacher" ? doc.source : "register";
  if (!termId || !CORE_SUBJECT_IDS.has(subjectId) || !category || !title || !Number.isFinite(week)) return null;
  return { id: doc.id, termId, subjectId, week, category, title, active: doc.active !== false, source };
}

async function readSettings(classKey: string) {
  const db = getAdminDb();
  const snap = await db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(settingsDocId(classKey)).get();
  const raw = snap.exists ? (snap.data() as Partial<AutomationSettings>) : {};
  return {
    autoWeeklyPlan: raw.autoWeeklyPlan !== false,
    autoDailyAssignments: raw.autoDailyAssignments !== false,
    includeQuran: raw.includeQuran !== false,
    includeSkillPractice: raw.includeSkillPractice !== false,
  } satisfies AutomationSettings;
}

async function loadSource(dateKey: string, upcomingIfSaturday = true): Promise<SourceBundle> {
  const db = getAdminDb();
  const [activeTermsSnap, studentsSnap] = await Promise.all([
    db.collection(firestoreCollectionName("terms")).where("active", "==", true).limit(1).get(),
    db.collection(firestoreCollectionName("students")).where("active", "==", true).get(),
  ]);
  const activeTermDoc = activeTermsSnap.docs[0];
  if (!activeTermDoc) throw new Error("CONTENT_INCOMPLETE:ACTIVE_TERM");
  const termId = activeTermDoc.id;
  const students = docsWithIds(studentsSnap.docs);
  const className = mostCommonClass(students);
  if (!className) throw new Error("CONTENT_INCOMPLETE:CLASS");
  const classKey = safeClassKey(className);
  const classStudents = students.filter((student) => String(student.className ?? "").trim() === className);
  const studentIds = classStudents.map((student) => student.id);
  const studentNames = new Map(classStudents.map((student) => [student.id, String(student.name ?? "")]));
  const dayName = dayNameForDateKey(dateKey);
  const weekStart = getWeekStartSunday(dateKey, upcomingIfSaturday && dayName === "السبت");
  const week = academicWeek(dateForKey(weekStart));

  async function byTerm(collectionName: string) {
    const snap = await db.collection(firestoreCollectionName(collectionName)).where("termId", "==", termId).get();
    return docsWithIds(snap.docs);
  }

  const [subjectDocs, planDocs, skillDocs, settings] = await Promise.all([
    byTerm("subjects"),
    byTerm("weeklyPlans"),
    byTerm("skills"),
    readSettings(classKey),
  ]);
  const subjects = subjectDocs.map(asSubject).filter((item): item is Subject => Boolean(item));
  const weeklyPlans = planDocs.map(asWeeklyPlan).filter((item): item is WeeklyPlan => Boolean(item));
  const skills = skillDocs.map(asSkill).filter((item): item is Skill => Boolean(item));

  return {
    input: {
      classId: classKey,
      termId,
      week,
      subjects,
      weeklyPlans,
      skills,
      timetable: EXISTING_CLASS_TIMETABLE,
      settings,
    },
    className,
    classKey,
    studentIds,
    studentNames,
    settings,
    weekStart,
  };
}

async function ensureWeekly(source: SourceBundle) {
  if (!source.settings.autoWeeklyPlan) return null;
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(weeklyDocId(source.classKey, source.weekStart));
  const generated = buildWeeklyPlan(source.input, source.weekStart);
  const now = new Date().toISOString();
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { id: existing.id, ...(existing.data() as PersistedWeekly) };
    const payload: PersistedWeekly = {
      ...generated,
      kind: "WEEKLY_PLAN",
      source: "AUTO",
      published: true,
      generatedAt: now,
      updatedAt: now,
    };
    transaction.create(ref, clean(payload));
    return { id: ref.id, ...payload };
  });
}

async function ensureDaily(source: SourceBundle, dateKey: string) {
  if (!source.settings.autoDailyAssignments) return null;
  const dayName = dayNameForDateKey(dateKey);
  if (!SCHOOL_DAYS.includes(dayName as SchoolDay)) return null;
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(dailyDocId(source.classKey, dateKey));
  const tasks = buildDailyAssignments(source.input, dateKey).map((task) => ({ ...task, completedStudentIds: [] }));
  const context = getTeachingContextForDate(source.input, dateKey);
  const incompleteSubjects = context?.subjects.filter((item) => item.contentStatus === "INCOMPLETE").map((item) => item.subject) ?? [];
  const now = new Date().toISOString();
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { id: existing.id, ...(existing.data() as PersistedDaily) };
    const payload: PersistedDaily = {
      kind: "DAILY_ASSIGNMENTS",
      classId: source.classKey,
      className: source.className,
      termId: source.input.termId,
      week: source.input.week,
      date: dateKey,
      source: "AUTO",
      published: true,
      generatedAt: now,
      updatedAt: now,
      tasks,
      incompleteSubjects,
    };
    transaction.create(ref, clean(payload));
    return { id: ref.id, ...payload };
  });
}

export async function syncPublishedLearningContentForDateKey(dateKey: string) {
  dateForKey(dateKey);
  const dayName = dayNameForDateKey(dateKey);
  if (dayName === "الجمعة") {
    return { date: dateKey, schoolDay: false, weeklyPlan: null, dailyAssignments: null, skipped: "NON_SCHOOL_DAY" as const };
  }
  const source = await loadSource(dateKey, true);
  const weeklyPlan = await ensureWeekly(source);
  const dailyAssignments = SCHOOL_DAYS.includes(dayName as SchoolDay) ? await ensureDaily(source, dateKey) : null;
  return {
    date: dateKey,
    schoolDay: SCHOOL_DAYS.includes(dayName as SchoolDay),
    classId: source.classKey,
    className: source.className,
    weekStart: source.weekStart,
    weeklyPlan,
    dailyAssignments,
  };
}

export async function syncPublishedLearningContent(date = new Date()) {
  return syncPublishedLearningContentForDateKey(riyadhDateKey(date));
}

export async function saveAutomationSettings(input: Partial<AutomationSettings>) {
  const source = await loadSource(riyadhDateKey(), false);
  const settings: AutomationSettings = {
    ...source.settings,
    ...(typeof input.autoWeeklyPlan === "boolean" ? { autoWeeklyPlan: input.autoWeeklyPlan } : {}),
    ...(typeof input.autoDailyAssignments === "boolean" ? { autoDailyAssignments: input.autoDailyAssignments } : {}),
    ...(typeof input.includeQuran === "boolean" ? { includeQuran: input.includeQuran } : {}),
    ...(typeof input.includeSkillPractice === "boolean" ? { includeSkillPractice: input.includeSkillPractice } : {}),
  };
  await getAdminDb()
    .collection(firestoreCollectionName(AUTOMATION_COLLECTION))
    .doc(settingsDocId(source.classKey))
    .set({ ...settings, updatedAt: new Date().toISOString() }, { merge: true });
  return settings;
}

export async function editDailyTask(dateKey: string, taskId: string, taskText: string) {
  const cleanText = taskText.trim();
  if (!cleanText) throw new Error("INVALID_TASK_TEXT");
  const source = await loadSource(dateKey, false);
  await ensureDaily(source, dateKey);
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(dailyDocId(source.classKey, dateKey));
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("DAILY_NOT_FOUND");
    const data = snap.data() as PersistedDaily;
    let found = false;
    const tasks = (data.tasks ?? []).map((task) => {
      if (task.id !== taskId) return task;
      found = true;
      return { ...task, taskText: cleanText, source: "MANUAL" as const };
    });
    if (!found) throw new Error("TASK_NOT_FOUND");
    const updatedAt = new Date().toISOString();
    transaction.set(ref, { tasks: clean(tasks), source: "MANUAL", updatedAt }, { merge: true });
    return { ...data, tasks, source: "MANUAL" as const, updatedAt };
  });
}

export async function editWeeklyItem(weekStart: string, itemId: string, expectedTask: string) {
  const cleanText = expectedTask.trim();
  if (!cleanText) throw new Error("INVALID_TASK_TEXT");
  const source = await loadSource(weekStart, false);
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(weeklyDocId(source.classKey, weekStart));
  await ensureWeekly({ ...source, weekStart });
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("WEEKLY_NOT_FOUND");
    const data = snap.data() as PersistedWeekly;
    let found = false;
    const days = data.days.map((day) => ({
      ...day,
      subjects: day.subjects.map((item) => {
        if (item.id !== itemId) return item;
        found = true;
        return { ...item, expectedTask: cleanText, source: "MANUAL" as const };
      }),
    }));
    if (!found) throw new Error("WEEKLY_ITEM_NOT_FOUND");
    const updatedAt = new Date().toISOString();
    transaction.set(ref, { days: clean(days), source: "MANUAL", hasManualOverrides: true, updatedAt }, { merge: true });
    return { ...data, days, source: "MANUAL" as const, hasManualOverrides: true, updatedAt };
  });
}

export async function toggleStudentTaskCompletion(studentId: string, taskId: string, dateKey = riyadhDateKey()) {
  if (dateKey !== riyadhDateKey()) throw new Error("ONLY_TODAY_CAN_BE_TOGGLED");
  const source = await loadSource(dateKey, false);
  if (!source.studentIds.includes(studentId)) throw new Error("STUDENT_NOT_IN_CLASS");
  await ensureDaily(source, dateKey);
  const db = getAdminDb();
  const ref = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION)).doc(dailyDocId(source.classKey, dateKey));
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) throw new Error("DAILY_NOT_FOUND");
    const data = snap.data() as PersistedDaily;
    let found = false;
    let completed = false;
    const tasks = (data.tasks ?? []).map((task) => {
      if (task.id !== taskId) return task;
      found = true;
      const current = new Set(task.completedStudentIds ?? []);
      if (current.has(studentId)) current.delete(studentId);
      else current.add(studentId);
      completed = current.has(studentId);
      return { ...task, completedStudentIds: [...current].sort() };
    });
    if (!found) throw new Error("TASK_NOT_FOUND");
    const updatedAt = new Date().toISOString();
    transaction.set(ref, { tasks: clean(tasks), updatedAt }, { merge: true });
    return { completed, updatedAt };
  });
}

function lastUpdated(...values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? "";
}

export async function getTeacherLearningDashboard(dateKey = riyadhDateKey()) {
  const sync = await syncPublishedLearningContentForDateKey(dateKey);
  const sourceDate = dayNameForDateKey(dateKey) === "السبت" ? addDays(dateKey, 1) : dateKey;
  const source = await loadSource(sourceDate, dayNameForDateKey(dateKey) === "السبت");
  const db = getAdminDb();
  const collection = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION));
  const [weeklySnap, dailySnap] = await Promise.all([
    collection.doc(weeklyDocId(source.classKey, source.weekStart)).get(),
    collection.doc(dailyDocId(source.classKey, dateKey)).get(),
  ]);
  const weekly = weeklySnap.exists ? ({ id: weeklySnap.id, ...(weeklySnap.data() as PersistedWeekly) }) : null;
  const daily = dailySnap.exists ? ({ id: dailySnap.id, ...(dailySnap.data() as PersistedDaily) }) : null;
  const students = source.studentIds.map((id) => ({ id, name: source.studentNames.get(id) ?? id }));
  const tasks = (daily?.tasks ?? []).map((task) => {
    const done = new Set(task.completedStudentIds ?? []);
    return {
      ...task,
      completedCount: students.filter((student) => done.has(student.id)).length,
      totalStudents: students.length,
      completedStudents: students.filter((student) => done.has(student.id)),
      pendingStudents: students.filter((student) => !done.has(student.id)),
    };
  });
  return {
    date: dateKey,
    className: source.className,
    classId: source.classKey,
    settings: source.settings,
    status: {
      weeklyPlan: weekly?.published ? "PUBLISHED" : "NOT_PUBLISHED",
      dailyAssignments: daily?.published ? "PUBLISHED" : "NOT_PUBLISHED",
      lastUpdated: lastUpdated(weekly?.updatedAt, daily?.updatedAt),
    },
    today: {
      published: Boolean(daily?.published),
      tasks,
      incompleteSubjects: daily?.incompleteSubjects ?? [],
    },
    week: weekly,
    sync,
  };
}

export async function listActiveStudents() {
  const snap = await getAdminDb().collection(firestoreCollectionName("students")).where("active", "==", true).get();
  return docsWithIds(snap.docs)
    .map((student) => ({ id: student.id, name: String(student.name ?? ""), className: String(student.className ?? "") }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
}

export async function getStudentLearningBundle(studentId: string, dateKey = riyadhDateKey()) {
  await syncPublishedLearningContentForDateKey(dateKey);
  const displayDate = dayNameForDateKey(dateKey) === "السبت" ? addDays(dateKey, 1) : dateKey;
  const source = await loadSource(displayDate, dayNameForDateKey(dateKey) === "السبت");
  if (!source.studentIds.includes(studentId)) throw new Error("STUDENT_NOT_IN_CLASS");
  const db = getAdminDb();
  const collection = db.collection(firestoreCollectionName(AUTOMATION_COLLECTION));
  const [studentSnap, starsSnap, weeklySnap, dailySnap] = await Promise.all([
    db.collection(firestoreCollectionName("students")).doc(studentId).get(),
    db.collection(firestoreCollectionName("valueStars")).where("studentId", "==", studentId).get(),
    collection.doc(weeklyDocId(source.classKey, source.weekStart)).get(),
    collection.doc(dailyDocId(source.classKey, dateKey)).get(),
  ]);
  if (!studentSnap.exists) throw new Error("STUDENT_NOT_FOUND");
  const student = studentSnap.data() as Record<string, unknown>;
  const daily = dailySnap.exists ? (dailySnap.data() as PersistedDaily) : null;
  const weekly = weeklySnap.exists ? (weeklySnap.data() as PersistedWeekly) : null;
  const tasks = (daily?.tasks ?? []).map(({ completedStudentIds, ...task }) => ({
    ...task,
    status: (completedStudentIds ?? []).includes(studentId) ? "COMPLETED" as const : "PENDING" as const,
  }));
  const dayName = dayNameForDateKey(dateKey);
  const schedule = SCHOOL_DAYS.includes(dayName as SchoolDay)
    ? (source.input.timetable[dayName as SchoolDay] ?? []).map((slot) => ({
        ...slot,
        subject: source.input.subjects.find((subject) => subject.id === slot.subjectId)?.name ?? slot.subjectId,
      }))
    : [];
  return {
    student: { id: studentId, name: String(student.name ?? ""), className: String(student.className ?? "") },
    valueStars: docsWithIds(starsSnap.docs).map((star) => ({ id: star.id })),
    subjects: source.input.subjects.sort((a, b) => a.order - b.order),
    today: {
      date: dateKey,
      day: dayName,
      tasks,
      schedule,
      incompleteSubjects: daily?.incompleteSubjects ?? [],
    },
    week: weekly ? { week: weekly.week, weekStart: weekly.weekStart, days: weekly.days } : null,
  };
}
