"use client";

import { useEffect, useMemo, useState } from "react";
import { guardianMe } from "@/lib/guardian-api";
import { academicWeek, plansForWeek } from "@/lib/schedule";
import type { Subject, WeeklyPlan } from "@/lib/types";

type WeeklyBundle = {
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
};

const preferredOrder = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية", "الإملاء والخط"];

export function StudentWeeklyPlan() {
  const [bundle, setBundle] = useState<WeeklyBundle | null>(null);
  const week = academicWeek();

  useEffect(() => {
    let alive = true;
    guardianMe<WeeklyBundle>()
      .then((data) => { if (alive) setBundle(data); })
      .catch(() => { if (alive) setBundle(null); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    if (!bundle) return [];
    const subjects = bundle.subjects
      .filter((subject) => subject.enabled !== false)
      .sort((a, b) => {
        const ai = preferredOrder.indexOf(a.name);
        const bi = preferredOrder.indexOf(b.name);
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return a.order - b.order;
      });
    const subjectMap = new Map(subjects.map((subject) => [subject.id, subject]));
    return plansForWeek(bundle.weeklyPlans, week)
      .filter((plan) => subjectMap.has(plan.subjectId))
      .sort((a, b) => {
        const sa = subjectMap.get(a.subjectId);
        const sb = subjectMap.get(b.subjectId);
        return (sa?.order ?? 99) - (sb?.order ?? 99);
      })
      .map((plan) => ({
        id: plan.id,
        subject: subjectMap.get(plan.subjectId)?.name ?? "المادة",
        title: plan.title,
      }));
  }, [bundle, week]);

  if (!rows.length) return null;

  return (
    <section className="student-week-plan" aria-label={`خطة الأسبوع ${week}`}>
      <header>
        <div>
          <small>من الدليل والتوزيع المعتمد</small>
          <h2>خطة الأسبوع {week}</h2>
        </div>
        <span>تتحدث تلقائيًا</span>
      </header>
      <div className="student-week-plan-list">
        {rows.map((row) => (
          <article key={row.id}>
            <b>{row.subject}</b>
            <p>{row.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
