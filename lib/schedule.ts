import type { Subject, WeeklyPlan } from "./types";

export const RIYADH_TZ = "Asia/Riyadh";
export const TERM_START = "2026-08-30";
export const SCHOOL_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;

type DailyItem = { day: string; title: string };

function riyadhDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RIYADH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function dayName(date: Date) {
  return new Intl.DateTimeFormat("ar-SA", { timeZone: RIYADH_TZ, weekday: "long" }).format(date);
}

export function academicWeek(date = new Date()) {
  const today = new Date(`${riyadhDateKey(date)}T12:00:00Z`);
  const start = new Date(`${TERM_START}T12:00:00Z`);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  return Math.max(1, Math.min(17, Math.floor(diffDays / 7) + 1));
}

export function tomorrowName(date = new Date()) {
  return dayName(new Date(date.getTime() + 86400000));
}

function quranDaily(title: string): DailyItem[] {
  const match = title.match(/الآيات\s*(\d+)\s*-\s*(\d+)/);
  if (!match) return SCHOOL_DAYS.map((day) => ({ day, title }));
  const from = Number(match[1]);
  const to = Number(match[2]);
  const count = Math.max(1, to - from + 1);
  const base = Math.floor(count / SCHOOL_DAYS.length);
  let extra = count % SCHOOL_DAYS.length;
  let cursor = from;
  const surah = title.match(/سورة\s+([^،]+)/)?.[1] ?? "السورة";
  return SCHOOL_DAYS.map((day) => {
    const size = Math.max(1, base + (extra-- > 0 ? 1 : 0));
    const end = Math.min(to, cursor + size - 1);
    const range = cursor <= to ? `${cursor}-${end}` : `${to}-${to}`;
    cursor = end + 1;
    return { day, title: `القرآن الكريم: حفظ ${surah} — الآيات ${range}` };
  });
}

function lughatiDaily(title: string): DailyItem[] {
  if (title.includes("مراجعة")) {
    const labels = ["قراءة", "فهم ومفردات", "مهارات لغوية", "إملاء وكتابة", "تقويم ومراجعة"];
    return SCHOOL_DAYS.map((day, i) => ({ day, title: `لغتي: ${title} — ${labels[i]}` }));
  }
  if (title.includes("نشاطات التهيئة")) {
    const labels = ["تهيئة أولية", "استماع وتحدث", "قراءة موجهة", "نشاط لغوي", "تطبيق ومراجعة"];
    return SCHOOL_DAYS.map((day, i) => ({ day, title: `لغتي: ${title} — ${labels[i]}` }));
  }
  const labels = ["قراءة النص", "الفهم والمفردات", "التراكيب والأساليب", "الإملاء والكتابة", "التطبيق والتقويم"];
  return SCHOOL_DAYS.map((day, i) => ({ day, title: `لغتي: ${title} — ${labels[i]}` }));
}

export function dailyBreakdown(plan: WeeklyPlan): DailyItem[] {
  if (plan.subjectId === "quran") return quranDaily(plan.title);
  if (plan.subjectId === "lughati") return lughatiDaily(plan.title);
  return [];
}

export function plansForWeek(plans: WeeklyPlan[], week = academicWeek()) {
  return plans.filter((plan) => plan.week === week);
}

export function tomorrowAnnouncement(plans: WeeklyPlan[], subjects: Subject[], date = new Date()) {
  const week = academicWeek(date);
  const tomorrow = tomorrowName(date);
  const tomorrowItems = plansForWeek(plans, week)
    .flatMap((plan) => dailyBreakdown(plan))
    .filter((item) => item.day === tomorrow);

  const subjectById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));
  const weeklyOnly = plansForWeek(plans, week)
    .filter((plan) => !["quran", "lughati"].includes(plan.subjectId))
    .map((plan) => `${subjectById[plan.subjectId] ?? "المادة"}: ${plan.title}`);

  return {
    week,
    tomorrow,
    items: tomorrowItems.map((item) => item.title),
    weeklyOnly,
  };
}
