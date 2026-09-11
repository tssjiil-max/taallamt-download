import type { Skill, Subject, WeeklyPlan } from "./types";

export const CORE_SUBJECT_IDS = ["lughati", "quran", "islamic", "spelling"] as const;

const displayNames: Record<string, string> = {
  lughati: "لغتي",
  quran: "القرآن الكريم",
  islamic: "الدراسات الإسلامية",
  spelling: "الإملاء وفن الخط",
};

export type WeeklyLearningItem = {
  subjectId: string;
  subjectName: string;
  lesson: string;
  skills: Skill[];
};

export function weeklyLearningSnapshot(
  weeklyPlans: WeeklyPlan[],
  skills: Skill[],
  subjects: Subject[],
  week: number,
  termId?: string,
): WeeklyLearningItem[] {
  const activeSubjects = subjects
    .filter((subject) => subject.enabled !== false)
    .filter((subject) => !termId || subject.termId === termId)
    .filter((subject) => CORE_SUBJECT_IDS.includes(subject.id as (typeof CORE_SUBJECT_IDS)[number]))
    .sort((a, b) => CORE_SUBJECT_IDS.indexOf(a.id as (typeof CORE_SUBJECT_IDS)[number]) - CORE_SUBJECT_IDS.indexOf(b.id as (typeof CORE_SUBJECT_IDS)[number]));

  return activeSubjects.map((subject) => {
    const plan = weeklyPlans.find((item) => item.subjectId === subject.id && item.week === week && (!termId || item.termId === termId));
    const weekSkills = skills
      .filter((item) => item.active !== false)
      .filter((item) => item.subjectId === subject.id && item.week === week)
      .filter((item) => !termId || item.termId === termId);

    return {
      subjectId: subject.id,
      subjectName: displayNames[subject.id] ?? subject.name,
      lesson: plan?.title ?? "لا يوجد درس مسجل لهذا الأسبوع",
      skills: weekSkills,
    };
  });
}

export function weeklySkillSummary(item: WeeklyLearningItem, max = 2) {
  const labels = item.skills.slice(0, max).map((skill) => skill.category);
  return labels.length ? labels.join(" · ") : "تُحدَّث المهارات من الدليل مع الدرس";
}
