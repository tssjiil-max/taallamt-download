"use client";

import Link from "next/link";
import { useState } from "react";
import { DateBar } from "@/components/DateBar";
import { StudentValues } from "@/components/StudentValues";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = { mastered: "متقن", partial: "أتقن البعض", needs_training: "نحتاج تدريبًا" };

export default function StudentPortal() {
  const store = useTaallamt();
  const active = store.students.filter((student) => student.active);
  const [previewId, setPreviewId] = useState("");
  const student = active.find((item) => item.id === previewId) ?? active[0];
  if (!student) return <main className="shell"><div className="notice">لا يوجد طالب للعرض.</div></main>;

  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId);
  const firstName = student.name.split(" ")[0];
  const mastered = subjects.filter((subject) => student.subjectLevels[subject.id] === "mastered").length;
  const week = academicWeek();
  const spelling = store.spellingPractices.find((item) => item.active && item.termId === store.activeTermId && item.week === week);
  const stars = store.valueStars.filter((star) => star.studentId === student.id).length;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🌟</div><div><h1>صفحة الطالب</h1><p>أتعلم · أطبق · أتحلى بقيمة جميلة</p></div></div><Link className="btn secondary no-print" href="/">لوحة المعلم</Link></header>
      <DateBar />
      <div className="card no-print"><div className="toolbar"><span>معاينة الطالب:</span><select className="field grow" value={student.id} onChange={(e) => setPreviewId(e.target.value)}>{active.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div></div>

      <section className="hero section"><div><h2>أهلًا يا {firstName} 👋</h2><p>ركز اليوم على مهمة واحدة، ثم احتفل بتقدمك. النجاح خطوات صغيرة تتكرر.</p></div><div className="hero-stats"><div className="stat"><b>{mastered}</b><span>مواد متقنة</span></div><div className="stat"><b>{week}</b><span>الأسبوع</span></div><div className="stat"><b>{stars}</b><span>نجوم قيم</span></div><div className="stat"><b>🎯</b><span>مهمة واحدة الآن</span></div></div></section>

      <section className="section two"><div className="card"><div className="icon amber">🎯</div><h3>مهمتي الآن</h3><p>أقرأ أو أسمّع أو أتدرب على المهارة التي حددها المعلم، ثم أحاول مرة أخرى إذا احتجت.</p></div>{spelling && <div className="card"><div className="icon green">✍️</div><h3>إملاء هذا الأسبوع</h3><p>{spelling.skill}</p><span className="badge section">{spelling.unitName}</span></div>}</section>

      <StudentValues studentId={student.id} />

      <section className="section"><div className="section-head"><h2>تقدمي</h2></div><div className="grid">{subjects.map((subject) => { const level = student.subjectLevels[subject.id]; const percent = level === "mastered" ? 100 : level === "needs_training" ? 30 : level === "partial" ? 60 : 0; return <div className="card" key={subject.id}><div className="icon">📚</div><h3>{subject.name}</h3><p>{level ? labels[level] : "لم يقيّم بعد"}</p><div className="progress-line section"><span style={{ width: `${percent}%` }} /></div></div>; })}</div></section>

      <section className="section"><div className="card shak-card"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>قد يناديك المعلم لتقرأ أو تسمّع أو تحاول مرة أخرى. اسمع التعليمات وخذها خطوة خطوة.</p></div></div></section>
    </main>
  );
}
