import type { Subject, WeeklyPlan } from "./types";

export const RIYADH_TZ = "Asia/Riyadh";
export const TERM_START = "2026-08-30";
export const SCHOOL_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"] as const;

export type SchoolPeriod={id:string;label:string;from:string;to:string;teaching:boolean};
export const DEFAULT_SCHOOL_PERIODS:SchoolPeriod[]=[
 {id:"arrival",label:"الطابور",from:"07:00",to:"07:15",teaching:false},{id:"1",label:"الحصة الأولى",from:"07:15",to:"08:00",teaching:true},{id:"2",label:"الحصة الثانية",from:"08:00",to:"08:45",teaching:true},{id:"3",label:"الحصة الثالثة",from:"08:45",to:"09:30",teaching:true},{id:"break",label:"الفسحة",from:"09:30",to:"09:50",teaching:false},{id:"4",label:"الحصة الرابعة",from:"09:50",to:"10:30",teaching:true},{id:"5",label:"الحصة الخامسة",from:"10:30",to:"11:10",teaching:true},{id:"6",label:"الحصة السادسة",from:"11:10",to:"11:50",teaching:true},{id:"7",label:"الحصة السابعة",from:"11:50",to:"12:30",teaching:true},{id:"prayer",label:"الصلاة",from:"12:30",to:"12:50",teaching:false}
];
function minutesInRiyadh(date:Date){const parts=new Intl.DateTimeFormat("en-GB",{timeZone:RIYADH_TZ,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return Number(values.hour)*60+Number(values.minute)}
function asMinutes(value:string){const[hour,minute]=value.split(":").map(Number);return hour*60+minute}
export function getSchoolStatus(date=new Date(),periods=DEFAULT_SCHOOL_PERIODS){const day=dayName(date);if(!SCHOOL_DAYS.includes(day as (typeof SCHOOL_DAYS)[number]))return{label:"عطلة أسبوعية",current:null,next:null};const minute=minutesInRiyadh(date),current=periods.find(period=>minute>=asMinutes(period.from)&&minute<asMinutes(period.to))??null,next=periods.find(period=>minute<asMinutes(period.from))??null;if(current)return{label:current.label,current,next};if(minute<asMinutes(periods[0].from))return{label:`القادم: ${periods[0].label}`,current:null,next:periods[0]};return{label:"انتهى الدوام",current:null,next:null}}

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
