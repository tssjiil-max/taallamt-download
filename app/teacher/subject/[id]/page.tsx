"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

function latestLevel(
  assessments: ReturnType<typeof useTaallamt>["assessments"],
  studentId: string,
  skillId: string,
) {
  const matches = assessments.filter((item) => item.studentId === studentId && item.skillId === skillId);
  return matches.length ? matches[matches.length - 1].level : undefined;
}

type Tab = "evaluation" | "week" | "skills" | "resources" | "spelling" | "values";

export default function SubjectWorkspace() {
  const params = useParams<{ id: string }>();
  const store = useTaallamt();
  const subject = store.subjects.find((item) => item.id === params.id);
  const term = store.terms.find((item) => item.active) ?? store.terms[0];
  const activeStudents = store.students.filter((item) => item.active);
  const plans = store.weeklyPlans
    .filter((item) => item.subjectId === params.id && item.termId === term?.id)
    .sort((a, b) => a.week - b.week);

  const initialWeek = Math.max(1, Math.min(17, academicWeek()));
  const [week, setWeek] = useState(initialWeek);
  const [tab, setTab] = useState<Tab>("evaluation");
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [notice, setNotice] = useState("");

  const weekPlan = plans.find((item) => item.week === week);
  const weekSkills = store.skills.filter(
    (item) => item.active && item.termId === term?.id && item.subjectId === params.id && item.week === week,
  );
  const selectedSkill = weekSkills.find((item) => item.id === selectedSkillId) ?? weekSkills[0];

  const stats = useMemo(() => {
    if (!selectedSkill) return { mastered: 0, partial: 0, needs_training: 0, pending: activeStudents.length };
    const values = activeStudents.map((student) => latestLevel(store.assessments, student.id, selectedSkill.id));
    return {
      mastered: values.filter((value) => value === "mastered").length,
      partial: values.filter((value) => value === "partial").length,
      needs_training: values.filter((value) => value === "needs_training").length,
      pending: values.filter((value) => !value).length,
    };
  }, [activeStudents, selectedSkill, store.assessments]);

  if (!subject) {
    return <main className="shell"><section className="card"><h2>المادة غير موجودة</h2><Link href="/">العودة للرئيسية</Link></section></main>;
  }

  const isLughati = subject.name.includes("لغتي");
  const subjectEmoji = isLughati ? "✏️" : subject.name.includes("قرآن") ? "📖" : "🕌";

  function chooseWeek(value: number) {
    setWeek(value);
    setSelectedSkillId("");
    setNotice("");
  }

  async function saveAssessment(studentId: string, level: MasteryLevel) {
    if (!selectedSkill) return;
    const key = `${studentId}:${selectedSkill.id}`;
    setSavingKey(key);
    setNotice("");
    try {
      const response = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, skillId: selectedSkill.id, level }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      store.setSkillAssessment(studentId, selectedSkill.id, level);
      setNotice("تم حفظ التقييم مباشرة، وسيظهر للطالب وولي الأمر حسب الصلاحية.");
    } catch {
      setNotice("تعذر حفظ التقييم في Firestore. أعد المحاولة.");
    } finally {
      setSavingKey("");
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "evaluation", label: "الطلاب والتقييم" },
    { id: "week", label: "الأسبوع والدرس" },
    { id: "skills", label: "المهارات" },
    { id: "resources", label: "الأوراق والمكتبة" },
    ...(isLughati ? [
      { id: "spelling" as Tab, label: "الإملاء والخط" },
      { id: "values" as Tab, label: "القيم والنجوم" },
    ] : []),
  ];

  return (
    <main className="shell">
      <header className="topbar subject-topbar">
        <div className="brand"><div className="logo">{subjectEmoji}</div><div><h1>{subject.name}</h1><p>الدرس والمهارات وأسماء الطلاب والتقييم في نفس المكان</p></div></div>
        <Link className="btn secondary" href="/">الرئيسية</Link>
      </header>

      <section className="subject-summary">
        <div><span className="eyebrow">الأسبوع {week}</span><h2>{weekPlan?.title ?? "لا يوجد عنوان مسجل لهذا الأسبوع"}</h2></div>
        <div className="compact-stats">
          <span><b>{stats.mastered}</b> متقن</span>
          <span><b>{stats.partial}</b> أتقن البعض</span>
          <span><b>{stats.needs_training}</b> يحتاج تدريب</span>
          <span><b>{stats.pending}</b> لم يقيّم</span>
        </div>
      </section>

      <div className="tabs subject-tabs no-print">
        {tabs.map((item) => <button key={item.id} type="button" className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>

      {notice && <div className="notice section">{notice}</div>}

      {tab === "evaluation" && (
        <>
          <section className="section no-print">
            <div className="section-head"><h2>اختر الأسبوع</h2><span className="pill">{weekPlan?.title ?? `الأسبوع ${week}`}</span></div>
            <div className="week-strip">{Array.from({ length: 17 }, (_, index) => index + 1).map((item) => <button key={item} type="button" className={`week-chip ${week === item ? "active" : ""}`} onClick={() => chooseWeek(item)}>{item}</button>)}</div>
          </section>

          <section className="section no-print">
            <div className="section-head"><h2>المهارة المراد تقييمها</h2><span className="pill">{weekSkills.length} مهارات</span></div>
            {weekSkills.length ? <div className="skill-choice-grid">{weekSkills.map((skill) => <button key={skill.id} type="button" className={`skill-choice ${selectedSkill?.id === skill.id ? "active" : ""}`} onClick={() => setSelectedSkillId(skill.id)}><b>{skill.category}</b><span>{skill.title}</span></button>)}</div> : <div className="notice warn">لا توجد مهارة مسجلة لهذا الأسبوع.</div>}
          </section>

          <section className="section">
            <div className="section-head"><div><h2>طلاب الفصل</h2><p>{selectedSkill ? `${selectedSkill.category} — ${selectedSkill.title}` : "اختر مهارة أولًا"}</p></div><span className="pill">{activeStudents.length} طالبًا</span></div>
            {!selectedSkill ? <div className="notice warn">لا يمكن التقييم قبل اختيار مهارة.</div> : <div className="student-eval-grid">{activeStudents.map((student, index) => {
              const value = latestLevel(store.assessments, student.id, selectedSkill.id);
              const rowSaving = savingKey === `${student.id}:${selectedSkill.id}`;
              return <article className="eval-card" key={student.id}>
                <div className="eval-student"><span className="avatar small">{index + 1}</span><div><h4>{student.name}</h4><small>{rowSaving ? "جاري الحفظ…" : value ? labels[value] : "لم يقيّم"}</small></div></div>
                <div className="eval-actions no-print">
                  {(["mastered", "partial", "needs_training"] as MasteryLevel[]).map((level) => <button key={level} type="button" disabled={rowSaving} className={`eval-btn ${value === level ? "active" : ""} ${level}`} onClick={() => void saveAssessment(student.id, level)}>{labels[level]}</button>)}
                </div>
              </article>;
            })}</div>}
          </section>
        </>
      )}

      {tab === "week" && (
        <section className="section">
          <div className="section-head"><h2>خطة المادة أسبوعًا بأسبوع</h2><span className="pill">الأسبوع المحدد {week}</span></div>
          <div className="week-strip no-print">{plans.map((plan) => <button key={plan.id} type="button" className={`week-chip ${week === plan.week ? "active" : ""}`} onClick={() => chooseWeek(plan.week)}>{plan.week}</button>)}</div>
          <div className="card focus-card"><span className="eyebrow">الأسبوع {week}</span><h3>{weekPlan?.title ?? "لا يوجد محتوى"}</h3><p>هذا هو المحتوى المسجل للمادة في الأسبوع المحدد. التقييم والمهارات المرتبطة به موجودة في التبويبات أعلاه.</p></div>
          <div className="mini-actions no-print section"><Link className="btn secondary" href="/teacher/distribution">تعديل التوزيع الأسبوعي</Link><Link className="btn secondary" href="/teacher/schedule">الخطة والنشر</Link></div>
        </section>
      )}

      {tab === "skills" && (
        <section className="section">
          <div className="section-head"><h2>مهارات الأسبوع {week}</h2><span className="pill">{weekSkills.length}</span></div>
          <div className="week-strip no-print">{Array.from({ length: 17 }, (_, index) => index + 1).map((item) => <button key={item} type="button" className={`week-chip ${week === item ? "active" : ""}`} onClick={() => chooseWeek(item)}>{item}</button>)}</div>
          {weekSkills.length ? <div className="list">{weekSkills.map((skill) => <div className="row" key={skill.id}><div><h4>{skill.category}</h4><small>{skill.title}</small></div><span className="badge">مهارة</span></div>)}</div> : <div className="notice warn">لا توجد مهارات لهذا الأسبوع.</div>}
        </section>
      )}

      {tab === "resources" && (
        <section className="section">
          <div className="section-head"><h2>الأوراق والمكتبة</h2></div>
          <div className="grid subject-action-grid">
            <Link className="card compact-card" href="/teacher/resources"><div className="icon">📝</div><h3>أوراق العمل والاختبارات</h3><p>إنشاء ورقة أو تدريب أو اختبار للمادة.</p></Link>
            <Link className="card compact-card" href="/teacher/library"><div className="icon green">📚</div><h3>المكتبة</h3><p>رفع ونشر ما تريد أن يحمله ولي الأمر.</p></Link>
            <Link className="card compact-card" href="/teacher/distribution"><div className="icon amber">🗓️</div><h3>التوزيع</h3><p>الرجوع إلى توزيع أسابيع المادة.</p></Link>
          </div>
        </section>
      )}

      {tab === "spelling" && isLughati && (
        <section className="section"><div className="card focus-card"><div className="icon">✍️</div><h2>الإملاء والخط</h2><p>جزء من لغتي: المهارة، تعريفها، الأمثلة، التدريب، معايير الخط والدرجة.</p><div className="mini-actions section"><Link className="btn" href="/teacher/spelling-handwriting">فتح الإملاء والخط</Link><Link className="btn secondary" href="/teacher/library">فتح المكتبة</Link></div></div></section>
      )}

      {tab === "values" && isLughati && (
        <section className="section"><div className="card focus-card"><div className="icon amber">⭐</div><h2>القيم والنجوم</h2><p>قيم الوحدة والتحفيز ونجوم الطلاب مرتبطة بلغتي بدل أن تكون قسمًا مشتتًا في الرئيسية.</p><div className="mini-actions section"><Link className="btn" href="/teacher/values">فتح القيم والنجوم</Link></div></div></section>
      )}

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
