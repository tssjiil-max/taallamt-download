"use client";

import Link from "next/link";
import { useState } from "react";
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

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🌟</div><div><h1>صفحة الطالب</h1><p>التقدم والمهام والتحفيز</p></div></div><Link className="btn secondary no-print" href="/">لوحة المعلم</Link></header>
      <div className="card no-print"><div className="toolbar"><span>معاينة الطالب:</span><select className="field grow" value={student.id} onChange={(e) => setPreviewId(e.target.value)}>{active.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div></div>
      <section className="hero section"><div><h2>أهلًا يا {firstName} 👋</h2><p>كل خطوة صغيرة تتقنها تحسب لك. ركز على مهمة واحدة ثم انتقل للي بعدها.</p></div><div className="hero-stats"><div className="stat"><b>{mastered}</b><span>مواد متقنة</span></div><div className="stat"><b>{subjects.length}</b><span>مواد هذا الفصل</span></div><div className="stat"><b>⭐</b><span>استمر</span></div><div className="stat"><b>1</b><span>مهمة في كل مرة</span></div></div></section>
      <section className="section"><div className="section-head"><h2>تقدمي</h2></div><div className="grid">{subjects.map((subject) => { const level = student.subjectLevels[subject.id] ?? "partial"; const percent = level === "mastered" ? 100 : level === "partial" ? 60 : 30; return <div className="card" key={subject.id}><div className="icon">📚</div><h3>{subject.name}</h3><p>{labels[level]}</p><div className="progress-line section"><span style={{width: `${percent}%`}} /></div></div>; })}</div></section>
      <section className="section two"><div className="card"><div className="icon amber">🎯</div><h3>مهمتي الآن</h3><p>ستظهر هنا المهمة التي يحددها المعلم: قراءة، تسميع، إملاء أو تدريب قصير.</p></div><div className="card shak-card"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>قد يناديك المعلم عن طريق شكابمبو لتقرأ أو تسمّع أو تحاول مرة أخرى.</p></div></div></section>
    </main>
  );
}
