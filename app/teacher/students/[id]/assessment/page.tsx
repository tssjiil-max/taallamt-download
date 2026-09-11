"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import { weeklyLearningSnapshot, weeklySkillSummary } from "@/lib/weekly-learning";
import type { BehaviorContext, BehaviorLevel, MasteryLevel, StudentFollowUpAction } from "@/lib/types";

const subjectLevels: Array<{ value: MasteryLevel; label: string }> = [
  { value: "mastered", label: "ممتاز" },
  { value: "partial", label: "متقن" },
  { value: "needs_training", label: "يحتاج متابعة" },
];

const behaviors = [
  ["instructions", "الالتزام بالتعليمات"],
  ["discipline", "الانضباط داخل الصف"],
  ["respect", "احترام الآخرين"],
  ["participation", "المشاركة الإيجابية"],
  ["responsibility", "تحمل المسؤولية"],
  ["cooperation", "التعاون مع الزملاء"],
  ["property", "المحافظة على الممتلكات"],
  ["cleanliness", "النظافة والترتيب"],
  ["permission", "الاستئذان وآداب الحديث"],
  ["honesty", "الصدق والأمانة"],
] as const;

const behaviorLevels: Array<{ value: BehaviorLevel; label: string }> = [
  { value: "excellent", label: "متميز" },
  { value: "good", label: "جيد" },
  { value: "needs_follow_up", label: "يحتاج متابعة" },
];

const followUpOptions: Array<{ value: StudentFollowUpAction; label: string }> = [
  { value: "needs_follow_up", label: "يحتاج متابعة" },
  { value: "special_follow_up", label: "متابعة خاصة" },
  { value: "guardian_contact", label: "تواصل مع ولي الأمر" },
  { value: "counselor_referral", label: "إحالة إلى المرشد الطلابي" },
  { value: "vice_principal_referral", label: "إحالة إلى الوكيل" },
  { value: "guardian_summons", label: "استدعاء ولي الأمر" },
];

export default function ComprehensiveStudentAssessmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === params.id);
  const activeStudents = useMemo(() => store.students.filter((item) => item.active), [store.students]);
  const currentIndex = activeStudents.findIndex((item) => item.id === params.id);
  const previousStudent = currentIndex > 0 ? activeStudents[currentIndex - 1] : undefined;
  const nextStudent = currentIndex >= 0 && currentIndex < activeStudents.length - 1 ? activeStudents[currentIndex + 1] : undefined;
  const [behaviorContext, setBehaviorContext] = useState<BehaviorContext>("classroom");
  const [followUpNote, setFollowUpNote] = useState("");
  const [notice, setNotice] = useState("");
  const [valueBusy, setValueBusy] = useState("");
  const week = academicWeek();
  const term = store.terms.find((item) => item.active) ?? store.terms[0];
  const weekly = weeklyLearningSnapshot(store.weeklyPlans, store.skills, store.subjects, week, term?.id);

  useEffect(() => {
    if (!student) return;
    setFollowUpNote(student.followUpNote ?? "");
    setNotice("");
  }, [student?.id, student?.followUpNote]);

  if (!store.ready) return <main className="ca-page"><div className="tc-empty">جاري تحميل ملف الطالب…</div></main>;
  if (!student) return <main className="ca-page"><div className="tc-empty">الطالب غير موجود.</div><Link className="ca-back" href="/teacher/students">العودة للطلاب</Link></main>;

  const currentActions: StudentFollowUpAction[] = student.followUpActions?.length
    ? student.followUpActions
    : student.specialFollowUp
      ? ["needs_follow_up"]
      : [];

  const currentValues = store.values.filter((value) => value.active && value.termId === store.activeTermId && value.weekFrom <= week && value.weekTo >= week);
  const visibleValues = currentValues.length ? currentValues : store.values.filter((value) => value.active && value.termId === store.activeTermId);

  function goToStudent(id?: string) {
    if (id) router.push(`/teacher/students/${id}/assessment`);
  }

  function saveSubjectLevel(subjectId: string, level: MasteryLevel) {
    store.setMastery(student.id, subjectId, level);
    setNotice("تم حفظ تقييم المادة.");
  }

  function saveBehavior(behaviorId: string, level: BehaviorLevel) {
    store.setBehaviorEvaluation(student.id, behaviorId, behaviorContext, level);
    setNotice("تم حفظ السلوك.");
  }

  function toggleFollowUp(action: StudentFollowUpAction) {
    const next = currentActions.includes(action) ? currentActions.filter((item) => item !== action) : [...currentActions, action];
    store.setStudentFollowUp(student.id, next, followUpNote);
    setNotice("تم حفظ إجراء المتابعة.");
  }

  function clearFollowUp() {
    store.setStudentFollowUp(student.id, [], followUpNote);
    setNotice("تم تحديد: لا يحتاج متابعة.");
  }

  function saveNote() {
    store.setStudentFollowUp(student.id, currentActions, followUpNote);
    setNotice("تم حفظ الملاحظة.");
  }

  async function addValueStar(valueId: string) {
    const value = visibleValues.find((item) => item.id === valueId);
    if (!value) return;
    setValueBusy(valueId);
    try {
      const response = await fetch("/api/teacher/value-stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          valueId: value.id,
          valueTitle: value.title,
          termId: value.termId,
          unitName: value.unitName,
          studentText: value.studentText,
          homeSuggestion: value.homeSuggestion,
          weekFrom: value.weekFrom,
          weekTo: value.weekTo,
          reason: value.title,
        }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      store.awardValueStar(student.id, value.id, value.title);
      setNotice("تم تعزيز القيمة.");
    } catch {
      setNotice("تعذر حفظ النجمة الآن.");
    } finally {
      setValueBusy("");
    }
  }

  async function removeValueStar(valueId: string) {
    const count = store.valueStars.filter((item) => item.studentId === student.id && item.valueId === valueId).length;
    if (count < 1) return;
    setValueBusy(valueId);
    try {
      const query = new URLSearchParams({ studentId: student.id, valueId });
      const response = await fetch(`/api/teacher/value-stars?${query.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      store.removeValueStar(student.id, valueId);
      setNotice("تم تحديث رصيد القيمة.");
    } catch {
      setNotice("تعذر تحديث النجمة الآن.");
    } finally {
      setValueBusy("");
    }
  }

  return (
    <main className="ca-page">
      <header className="ca-student-head">
        <div>
          <small>التقييم الشامل · الأسبوع {week}</small>
          <h1>{student.name}</h1>
          <p>{student.className}</p>
        </div>
        <div className="ca-student-nav no-print">
          <Link href="/teacher/students">قائمة الطلاب</Link>
          <button type="button" disabled={!previousStudent} onClick={() => goToStudent(previousStudent?.id)}>السابق</button>
          <button type="button" disabled={!nextStudent} onClick={() => goToStudent(nextStudent?.id)}>التالي</button>
        </div>
      </header>

      {notice && <div className="ca-notice" role="status">{notice}</div>}

      <section className="ca-section ca-week-context">
        <header><h2>هذا الأسبوع</h2><span>من الدليل والتوزيع</span></header>
        <div className="ca-week-list">
          {weekly.map((item) => (
            <article key={item.subjectId}>
              <b>{item.subjectName}</b>
              <div><strong>{item.lesson}</strong><small>{weeklySkillSummary(item)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="ca-section">
        <header><h2>المواد</h2><span>حفظ تلقائي</span></header>
        <div className="ca-rows">
          {weekly.map((item) => {
            const currentLevel = student.subjectLevels[item.subjectId];
            return (
              <article className="ca-row" key={item.subjectId}>
                <div className="ca-label"><b>{item.subjectName}</b><small>{item.lesson}</small></div>
                <div className="ca-choice">
                  {subjectLevels.map((option) => (
                    <button type="button" className={currentLevel === option.value ? `active ${option.value}` : option.value} onClick={() => saveSubjectLevel(item.subjectId, option.value)} key={option.value}>{option.label}</button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ca-section">
        <header className="ca-behavior-head">
          <h2>السلوك</h2>
          <div className="ca-segmented no-print"><button className={behaviorContext === "classroom" ? "active" : ""} type="button" onClick={() => setBehaviorContext("classroom")}>الفصل</button><button className={behaviorContext === "school" ? "active" : ""} type="button" onClick={() => setBehaviorContext("school")}>المدرسة</button></div>
        </header>
        <div className="ca-rows">
          {behaviors.map(([behaviorId, title]) => {
            const current = store.behaviorEvaluations.find((item) => item.studentId === student.id && item.behaviorId === behaviorId && item.context === behaviorContext)?.level;
            return (
              <article className="ca-row ca-behavior-row" key={behaviorId}>
                <div className="ca-label"><b>{title}</b></div>
                <div className="ca-choice">
                  {behaviorLevels.map((option) => (
                    <button type="button" className={current === option.value ? `active ${option.value}` : option.value} onClick={() => saveBehavior(behaviorId, option.value)} key={option.value}>{option.label}</button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ca-section">
        <header><h2>القيم</h2><span>القيم المرتبطة بالأسبوع</span></header>
        <div className="ca-values">
          {visibleValues.map((value) => {
            const count = store.valueStars.filter((item) => item.studentId === student.id && item.valueId === value.id).length;
            return (
              <article key={value.id}>
                <div><b>{value.title}</b><small>{value.unitName}</small></div>
                <div className="ca-stepper no-print"><button type="button" disabled={valueBusy === value.id || count < 1} onClick={() => void removeValueStar(value.id)}>−</button><strong>⭐ {count}</strong><button type="button" disabled={valueBusy === value.id} onClick={() => void addValueStar(value.id)}>+</button></div>
              </article>
            );
          })}
          {!visibleValues.length && <div className="tc-empty">لا توجد قيم مفعلة.</div>}
        </div>
      </section>

      <section className="ca-section ca-followup">
        <header><h2>المتابعة والإجراءات</h2><span>يمكن اختيار أكثر من إجراء</span></header>
        <div className="ca-followup-options no-print">
          <button type="button" className={!currentActions.length ? "active" : ""} onClick={clearFollowUp}>لا يحتاج متابعة</button>
          {followUpOptions.map((option) => <button type="button" className={currentActions.includes(option.value) ? "active" : ""} onClick={() => toggleFollowUp(option.value)} key={option.value}>{option.label}</button>)}
        </div>
        <label className="ca-note-label">ملاحظة مختصرة — اختيارية
          <textarea value={followUpNote} onChange={(event) => setFollowUpNote(event.target.value)} onBlur={saveNote} rows={3} placeholder="اكتب ملاحظة عند الحاجة فقط" />
        </label>
      </section>
    </main>
  );
}
