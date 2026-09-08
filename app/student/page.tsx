"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { latestAssessmentBySkill, skillsNeedingTraining, studentGoal } from "@/lib/assessment";
import { academicWeek } from "@/lib/schedule";
import type { MasteryLevel, Skill, SkillAssessment, SpellingPractice, Subject, Term, ValueStar, ValueTarget } from "@/lib/types";

const labels: Record<MasteryLevel, string> = { mastered: "متقن", partial: "أتقن البعض", needs_training: "نحتاج تدريبًا" };

type StudentListItem = { id: string; name: string; className: string };
type StudentBundle = {
  student: StudentListItem;
  activeTerm: Term | null;
  subjects: Subject[];
  skills: Skill[];
  assessments: SkillAssessment[];
  values: ValueTarget[];
  valueStars: ValueStar[];
  spellingPractices: SpellingPractice[];
};

async function readJson<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error("REQUEST_FAILED");
  return payload;
}

export default function StudentPortal() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [bundle, setBundle] = useState<StudentBundle | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const previousFingerprint = useRef("");

  async function loadStudents() {
    const result = await readJson<{ students: StudentListItem[] }>(await fetch("/api/teacher/student-preview", { cache: "no-store" }));
    setStudents(result.students);
    if (!selectedId && result.students.length) setSelectedId(result.students[0].id);
  }

  async function loadStudent(id: string, announce = false) {
    if (!id) return;
    const result = await readJson<StudentBundle>(await fetch(`/api/teacher/student-preview?studentId=${encodeURIComponent(id)}`, { cache: "no-store" }));
    const fingerprint = `${result.assessments.length}:${result.valueStars.length}:${result.assessments.at(-1)?.id ?? ""}:${result.valueStars.at(-1)?.id ?? ""}`;
    if (announce && previousFingerprint.current && previousFingerprint.current !== fingerprint) {
      const oldParts = previousFingerprint.current.split(":");
      const assessmentChanged = result.assessments.length !== Number(oldParts[0]);
      const text = assessmentChanged ? "وصل تحديث جديد من المعلم على تقييمك." : "أضاف لك المعلم نجمة جديدة 🌟";
      setNotice(text);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("تعلّمت", { body: text, icon: "/shakabumbo.jpg" });
      }
    }
    previousFingerprint.current = fingerprint;
    setBundle(result);
  }

  useEffect(() => {
    if (!("Notification" in window)) setPermission("unsupported");
    else setPermission(Notification.permission);
    loadStudents().catch(() => setNotice("تعذر تحميل قائمة الطلاب. تأكد من دخول المعلم.")).finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setBusy(true);
    previousFingerprint.current = "";
    loadStudent(selectedId).catch(() => setNotice("تعذر تحميل بيانات الطالب من Firestore.")).finally(() => setBusy(false));
    const timer = window.setInterval(() => {
      loadStudent(selectedId, true).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId]);

  async function refreshNow() {
    if (!selectedId) return;
    setBusy(true);
    setNotice("");
    await loadStudent(selectedId, true).catch(() => setNotice("تعذر التحديث الآن.")).finally(() => setBusy(false));
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  const week = academicWeek();
  const latest = useMemo(() => bundle ? latestAssessmentBySkill(bundle.assessments, bundle.student.id) : new Map<string, SkillAssessment>(), [bundle]);

  if (busy && !bundle) return <main className="shell"><div className="notice">جاري تحميل صفحة الطالب من Firestore…</div></main>;
  if (!students.length) return <main className="shell"><div className="notice warn">لا توجد بيانات طلاب متاحة. افتح الصفحة بعد تسجيل دخول المعلم.</div><Link className="btn section" href="/">لوحة المعلم</Link></main>;
  if (!bundle) return <main className="shell"><div className="notice warn">تعذر فتح بيانات الطالب.</div></main>;

  const student = bundle.student;
  const subjects = [...bundle.subjects].sort((a, b) => a.order - b.order);
  const activeSkills = bundle.skills.filter((skill) => skill.active !== false);
  const needsSkills = skillsNeedingTraining(activeSkills, bundle.assessments, student.id, bundle.activeTerm?.id);
  const weeklySkills = activeSkills.filter((skill) => skill.week === week);
  const focusSkill = needsSkills[0] ?? weeklySkills[0];
  const focusSubject = focusSkill ? subjects.find((subject) => subject.id === focusSkill.subjectId) : undefined;
  const firstName = student.name.split(" ")[0];
  const mastered = Array.from(latest.values()).filter((assessment) => assessment.level === "mastered").length;
  const stars = bundle.valueStars.length;
  const spelling = bundle.spellingPractices.find((item) => item.active && item.week === week);
  const currentValues = bundle.values.filter((item) => item.active && week >= item.weekFrom && week <= item.weekTo);

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🌟</div><div><h1>صفحة الطالب</h1><p>أتعلم · أطبق · أتحلى بقيمة جميلة</p></div></div><div className="mini-actions no-print"><button className="btn" type="button" disabled={busy} onClick={() => void refreshNow()}>{busy ? "يحدّث…" : "تحديث الآن"}</button><Link className="btn secondary" href="/">لوحة المعلم</Link></div></header>
      <DateBar />

      <div className="card no-print"><div className="toolbar"><span>الطالب:</span><select className="field grow" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{students.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span className="badge">تحديث تلقائي كل 5 ثوانٍ</span></div></div>

      <section className="section no-print"><div className="section-head"><h2>🔔 إشعارات الطالب</h2>{permission === "granted" ? <span className="badge">مفعلة</span> : permission === "unsupported" ? <span className="badge warn">غير مدعومة</span> : <button className="btn" type="button" onClick={() => void enableNotifications()}>تفعيل الإشعارات</button>}</div>{notice ? <div className="notice">{notice}</div> : <div className="notice">أي تقييم أو نجمة جديدة من المعلم تظهر هنا تلقائيًا أثناء فتح الصفحة.</div>}</section>

      <section className="hero section"><div><h2>أهلًا يا {firstName} 👋</h2><p>ركز اليوم على مهمة واحدة، ثم احتفل بتقدمك. هذه البيانات تأتي مباشرة من Firestore.</p></div><div className="hero-stats"><div className="stat"><b>{mastered}</b><span>مهارات متقنة</span></div><div className="stat"><b>{week}</b><span>الأسبوع</span></div><div className="stat"><b>{stars}</b><span>نجوم قيم</span></div><div className="stat"><b>{needsSkills.length}</b><span>أهداف تدريب</span></div></div></section>

      <section className="section two">
        <div className="card"><div className="icon amber">🎯</div><h3>مهمتي الآن</h3>{focusSkill ? <><p>{studentGoal(focusSkill)}</p><div className="toolbar section"><span className="badge">{focusSubject?.name ?? "المادة"}</span><span className="badge">{focusSkill.category}</span>{needsSkills.some((skill) => skill.id === focusSkill.id) && <span className="badge warn">أحاول مرة أخرى</span>}</div></> : <p>لا توجد مهمة مهارية محددة الآن.</p>}</div>

        <details className="card">
          <summary style={{ cursor: "pointer", fontWeight: 800 }}><span className="icon green">✍️</span> الإملاء والخط — اضغط للفتح</summary>
          {spelling ? <div className="section"><h3>{spelling.unitName}</h3><p>{spelling.skill}</p>{spelling.handwritingChecklist?.length ? <ul>{spelling.handwritingChecklist.map((item) => <li key={item}>{item}</li>)}</ul> : null}</div> : <p className="section">لا يوجد تدريب إملاء محدد لهذا الأسبوع.</p>}
        </details>
      </section>

      <section className="section"><div className="section-head"><h2>🌟 تحدي القيم</h2></div><div className="grid">{currentValues.map((value) => { const count = bundle.valueStars.filter((star) => star.valueId === value.id).length; const next = count >= 8 ? "أحسنت! وصلت للجائزة المميزة 🎉" : count >= 5 ? "أنت نجم الأسبوع 🌟" : count >= 3 ? "أنت بطل القيمة ⭐" : `اجمع ${3 - count} نجوم إضافية لتصبح بطل القيمة`; return <div className="card" key={value.id}><h3>{value.title}</h3><p>{value.studentText}</p><div style={{ fontSize: 24 }}>{"⭐".repeat(Math.min(count, 8)) || "☆ ☆ ☆"}</div><div className="notice section">{next}</div></div>; })}{currentValues.length === 0 && <div className="notice">لا توجد قيمة محددة لهذا الأسبوع.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>موادي — اضغط على المادة لفتح مهاراتها</h2></div><div className="grid">{subjects.map((subject) => { const subjectSkills = weeklySkills.filter((skill) => skill.subjectId === subject.id); const subjectNeeds = subjectSkills.filter((skill) => latest.get(skill.id)?.level === "needs_training").length; return <details className="card" key={subject.id}><summary style={{ cursor: "pointer", fontWeight: 800 }}><div className="icon">📚</div>{subject.name} {subjectNeeds ? <span className="badge warn">{subjectNeeds} تحتاج تدريب</span> : null}</summary><div className="list section">{subjectSkills.map((skill) => { const assessment = latest.get(skill.id); return <div className="row" key={skill.id}><div><h4>{skill.category}</h4><small>{skill.title}</small></div><span className={`badge ${assessment?.level === "needs_training" ? "warn" : ""}`}>{assessment ? labels[assessment.level] : "لم يقيّم"}</span></div>; })}{subjectSkills.length === 0 && <div className="notice">لا توجد مهارات لهذه المادة في الأسبوع الحالي.</div>}</div></details>; })}</div></section>

      <section className="section"><div className="card shak-card"><img className="shak-thumb" src="/shakabumbo.jpg" alt="شكابمبو" /><div><h3>شكابمبو</h3><p>قد يناديك المعلم لتقرأ أو تسمّع أو تحاول مرة أخرى. اسمع التعليمات وخذها خطوة خطوة.</p></div></div></section>
    </main>
  );
}