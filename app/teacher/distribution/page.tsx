"use client";

import Link from "next/link";
import { useState } from "react";
import { useTaallamt } from "@/lib/store";

export default function DistributionPage() {
  const store = useTaallamt();
  const [week, setWeek] = useState(1);
  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId).sort((a, b) => a.order - b.order);
  const activeTerm = store.terms.find((term) => term.id === store.activeTermId);

  function titleFor(subjectId: string, selectedWeek = week) {
    return store.weeklyPlans.find((plan) => plan.termId === store.activeTermId && plan.subjectId === subjectId && plan.week === selectedWeek)?.title ?? "";
  }

  function copyPrevious() {
    if (week <= 1) return;
    subjects.forEach((subject) => {
      const previous = titleFor(subject.id, week - 1);
      if (previous) store.updateWeeklyPlan(subject.id, week, previous);
    });
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">📅</div><div><h1>التوزيع الأسبوعي</h1><p>{activeTerm?.name} · قابل للتعديل لكل فصل</p></div></div><Link className="btn secondary no-print" href="/">الرئيسية</Link></header>

      <section className="card no-print">
        <div className="toolbar"><label>الأسبوع <select className="field" value={week} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, index) => <option key={index + 1} value={index + 1}>الأسبوع {index + 1}</option>)}</select></label><button className="btn secondary" disabled={week <= 1} onClick={copyPrevious}>نسخ من الأسبوع السابق</button></div>
      </section>

      <section className="hero section"><div><h2>الأسبوع {week}</h2><p>تم إدخال التوزيع الأساسي من أوراق القرآن الكريم والدراسات الإسلامية ولغتي. تستطيع تعديل أي أسبوع مباشرة، والفصل الثاني يمكن أن يكون له توزيع مختلف كليًا.</p></div><div className="hero-stats"><div className="stat"><b>{subjects.length}</b><span>مواد مفعلة</span></div><div className="stat"><b>{subjects.filter((s) => titleFor(s.id)).length}</b><span>مواد لها توزيع</span></div><div className="stat"><b>17</b><span>أسبوعًا تعليميًا</span></div><div className="stat"><b>✎</b><span>تعديل مباشر</span></div></div></section>

      <section className="section list">
        {subjects.map((subject) => <div className="card" key={subject.id}><div className="section-head"><h2>{subject.name}</h2><span className="badge">الأسبوع {week}</span></div><textarea className="field textarea no-print" value={titleFor(subject.id)} onChange={(e) => store.updateWeeklyPlan(subject.id, week, e.target.value)} placeholder="اكتب ما سيتم تدريسه هذا الأسبوع" /><div className="prompt-box">{titleFor(subject.id) || "لم يحدد توزيع لهذا الأسبوع بعد."}</div></div>)}
      </section>

      <section className="section"><div className="notice warn">الإملاء جزء من «لغتي» ولا يظهر كمادة مستقلة. لاحقًا سنربط كل درس بالمهارات ونصوص الإملاء والخطط العلاجية المخصصة.</div></section>
    </main>
  );
}
