"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { PrintButton } from "@/components/PrintButton";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

function latestLevel(assessments: ReturnType<typeof useTaallamt>["assessments"], studentId: string, skillId: string) {
  const matches = assessments.filter((item) => item.studentId === studentId && item.skillId === skillId);
  return matches.length ? matches[matches.length - 1].level : undefined;
}

export default function AssessmentPage() {
  const store = useTaallamt();
  const activeTerm = store.terms.find((term) => term.active) ?? store.terms[0];
  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id).sort((a, b) => a.order - b.order);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "quran");
  const [week, setWeek] = useState(academicWeek());
  const skills = store.skills.filter((skill) => skill.active && skill.termId === activeTerm?.id && skill.subjectId === subjectId && skill.week === week);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const selectedSkill = skills.find((skill) => skill.id === selectedSkillId) ?? skills[0];
  const students = store.students.filter((student) => student.active);
  const [savingKey, setSavingKey] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  const stats = useMemo(() => {
    if (!selectedSkill) return { mastered: 0, partial: 0, needs_training: 0, pending: students.length };
    const values = students.map((student) => latestLevel(store.assessments, student.id, selectedSkill.id));
    return {
      mastered: values.filter((value) => value === "mastered").length,
      partial: values.filter((value) => value === "partial").length,
      needs_training: values.filter((value) => value === "needs_training").length,
      pending: values.filter((value) => !value).length,
    };
  }, [selectedSkill, students, store.assessments]);

  function chooseSubject(id: string) {
    setSubjectId(id);
    setSelectedSkillId("");
  }

  function chooseWeek(value: number) {
    setWeek(value);
    setSelectedSkillId("");
  }

  async function saveAssessment(studentId: string, level: MasteryLevel) {
    if (!selectedSkill) return;
    const key = `${studentId}:${selectedSkill.id}`;
    setSavingKey(key);
    setSaveNotice("");
    try {
      const response = await fetch("/api/teacher/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, skillId: selectedSkill.id, level }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      store.setSkillAssessment(studentId, selectedSkill.id, level);
      setSaveNotice("تم الحفظ في Firestore وسيظهر التحديث في صفحة الطالب خلال ثوانٍ.");
    } catch {
      setSaveNotice("تعذر حفظ التقييم في Firestore. أعد المحاولة.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">✅</div><div><h1>سجل متابعة الطلاب</h1><p>الصف الثاني الابتدائي — الفصل الأول 1448هـ</p></div></div>
        <div className="mini-actions no-print"><PrintButton label="طباعة السجل" /><Link className="btn secondary" href="/">لوحة المعلم</Link></div>
      </header>
      <DateBar />

      <section className="hero section">
        <div><h2>تقييم المهارة في أقل عدد من الضغطات</h2><p>اختر المادة والأسبوع والمهارة، ثم قيّم كل طالب. الخيارات ظاهرة مباشرة حتى لا تحتاج فتح قوائم مخفية.</p></div>
        <div className="hero-stats">
          <div className="stat"><b>{stats.mastered}</b><span>متقن</span></div>
          <div className="stat"><b>{stats.partial}</b><span>أتقن البعض</span></div>
          <div className="stat"><b>{stats.needs_training}</b><span>يحتاج تدريب</span></div>
          <div className="stat"><b>{stats.pending}</b><span>لم يُقيّم بعد</span></div>
        </div>
      </section>

      {saveNotice && <div className="notice section">{saveNotice}</div>}

      <section className="section no-print">
        <div className="card stack">
          <h3>1) اختر المادة</h3>
          <div className="toolbar" style={{ flexWrap: "wrap" }}>
            {subjects.map((subject) => (
              <button key={subject.id} className={`btn ${subjectId === subject.id ? "" : "secondary"}`} type="button" onClick={() => chooseSubject(subject.id)}>{subject.name}</button>
            ))}
          </div>

          <h3 className="section">2) اختر الأسبوع</h3>
          <div className="toolbar" style={{ flexWrap: "wrap" }}>
            {Array.from({ length: 17 }, (_, index) => index + 1).map((item) => (
              <button key={item} className={`btn ${week === item ? "" : "secondary"}`} type="button" onClick={() => chooseWeek(item)}>{item}</button>
            ))}
          </div>

          <h3 className="section">3) اختر المهارة</h3>
          {skills.length ? (
            <div className="list">
              {skills.map((skill) => (
                <button key={skill.id} type="button" className={`row ${selectedSkill?.id === skill.id ? "selected" : ""}`} onClick={() => setSelectedSkillId(skill.id)}>
                  <div className="grow"><h4>{skill.category}</h4><small>{skill.title}</small></div>
                  <span className="badge">{selectedSkill?.id === skill.id ? "محددة" : "اختيار"}</span>
                </button>
              ))}
            </div>
          ) : <div className="notice warn">لا توجد مهارة لهذه المادة في الأسبوع {week}.</div>}

          {selectedSkill && <div className="notice"><b>المحدد الآن:</b> {subjects.find((subject) => subject.id === subjectId)?.name} · الأسبوع {week} · {selectedSkill.category} — {selectedSkill.title}</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>{selectedSkill ? `تقييم: ${selectedSkill.category}` : "لا توجد مهارة لهذا الأسبوع"}</h2><span className="pill">{students.length} طالبًا</span></div>
        {!selectedSkill ? <div className="notice warn">اختر مادة وأسبوعًا توجد لهما مهارة أولًا.</div> : (
          <div className="list">
            {students.map((student, index) => {
              const value = latestLevel(store.assessments, student.id, selectedSkill.id);
              const rowSaving = savingKey === `${student.id}:${selectedSkill.id}`;
              return (
                <div className="row" key={student.id}>
                  <div className="row-main"><div className="avatar">{index + 1}</div><div><h4>{student.name}</h4><small>{rowSaving ? "جاري الحفظ…" : value ? `آخر تقييم: ${labels[value]}` : "لم يُقيّم بعد"}</small></div></div>
                  <div className="mini-actions no-print">
                    {(["mastered", "partial", "needs_training"] as MasteryLevel[]).map((level) => (
                      <button key={level} className={`btn ${value === level ? "" : "secondary"}`} type="button" disabled={rowSaving} onClick={() => void saveAssessment(student.id, level)}>{labels[level]}</button>
                    ))}
                  </div>
                  <span className={`badge ${value === "needs_training" ? "warn" : ""}`} style={{ display: value ? "inline-flex" : "none" }}>{value ? labels[value] : ""}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section"><div className="notice warn"><b>مهم:</b> هذه المهارات بذرة تشغيلية مبنية على توزيع الفصل الأول ومراجع سجلات المتابعة 1448، وستبقى قابلة للتعديل عند اعتماد الصياغة النهائية لكل مهارة من الكتاب والسجل.</div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}