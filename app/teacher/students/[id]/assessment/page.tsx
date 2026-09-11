"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";
import type { BehaviorContext, BehaviorLevel, MasteryLevel, StudentFollowUpAction } from "@/lib/types";

const subjectOrder = ["lughati", "quran", "islamic", "spelling"];
const subjectDisplayNames: Record<string, string> = {
  lughati: "لغتي",
  quran: "القرآن الكريم",
  islamic: "الدراسات الإسلامية",
  spelling: "الإملاء وفن الخط",
};

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

const followUpStatusLabels = {
  improving: "يتحسن",
  stable: "مستقر",
  needs_review: "يحتاج مراجعة",
} as const;

const followUpCategoryLabels = {
  health: "حالة صحية مؤثرة على التعلم",
  learning: "صعوبة أو ضعف تعليمي",
  behavior: "متابعة سلوكية",
  family: "ظرف أسري مؤثر",
  other: "متابعة أخرى",
} as const;

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

  const legacyFollowUp = student ? store.followUps[student.id] : undefined;

  useEffect(() => {
    if (!student) return;
    setFollowUpNote(student.followUpNote ?? legacyFollowUp?.goal ?? "");
    setNotice("");
  }, [student?.id, student?.followUpNote, legacyFollowUp?.goal]);

  const subjects = useMemo(() => {
    if (!student) return [];
    return store.subjects
      .filter((subject) => subject.enabled && subject.termId === store.activeTermId && subjectOrder.includes(subject.id))
      .sort((a, b) => subjectOrder.indexOf(a.id) - subjectOrder.indexOf(b.id))
      .map((subject) => {
        const explicit = student.subjectLevels[subject.id];
        const skillIds = new Set(
          store.skills
            .filter((skill) => skill.active && skill.termId === store.activeTermId && skill.subjectId === subject.id)
            .map((skill) => skill.id),
        );
        const levels = store.assessments
          .filter((assessment) => assessment.studentId === student.id && skillIds.has(assessment.skillId))
          .map((assessment) => assessment.level);
        const derived: MasteryLevel | undefined = levels.includes("needs_training")
          ? "needs_training"
          : levels.includes("partial")
            ? "partial"
            : levels.includes("mastered")
              ? "mastered"
              : undefined;
        return {
          ...subject,
          displayName: subjectDisplayNames[subject.id] ?? subject.name,
          level: explicit ?? derived,
          assessedSkills: levels.length,
        };
      });
  }, [student, store.subjects, store.skills, store.assessments, store.activeTermId]);

  const activeValues = useMemo(
    () => store.values.filter((item) => item.active && item.termId === store.activeTermId),
    [store.values, store.activeTermId],
  );

  if (!store.ready) {
    return <main className="shell inner-shell"><div className="empty-state">جاري تحميل ملف الطالب…</div></main>;
  }

  if (!student) {
    return <main className="shell inner-shell"><div className="empty-state">الطالب غير موجود.</div><Link className="btn" href="/teacher/students">العودة لقائمة الطلاب</Link></main>;
  }

  const effectiveFollowUpActions: StudentFollowUpAction[] = student.followUpActions?.length
    ? student.followUpActions
    : student.specialFollowUp
      ? ["needs_follow_up"]
      : [];

  function goToStudent(id?: string) {
    if (!id) return;
    router.push(`/teacher/students/${id}/assessment`);
  }

  function saveSubjectLevel(subjectId: string, level: MasteryLevel) {
    if (!student) return;
    store.setMastery(student.id, subjectId, level);
    setNotice("تم حفظ تقييم المادة تلقائيًا.");
  }

  function saveBehavior(behaviorId: string, level: BehaviorLevel) {
    if (!student) return;
    store.setBehaviorEvaluation(student.id, behaviorId, behaviorContext, level);
    setNotice("تم حفظ تقييم السلوك تلقائيًا.");
  }

  function toggleFollowUp(action: StudentFollowUpAction) {
    if (!student) return;
    const current = effectiveFollowUpActions;
    const next = current.includes(action) ? current.filter((item) => item !== action) : [...current, action];
    store.setStudentFollowUp(student.id, next, followUpNote);
    setNotice("تم حفظ إجراءات المتابعة.");
  }

  function clearFollowUp() {
    if (!student) return;
    store.setStudentFollowUp(student.id, [], followUpNote);
    setNotice("تم تحديد: لا يحتاج متابعة.");
  }

  function saveFollowUpNote() {
    if (!student) return;
    store.setStudentFollowUp(student.id, effectiveFollowUpActions, followUpNote);
    setNotice("تم حفظ الملاحظة.");
  }

  async function addValueStar(valueId: string) {
    if (!student) return;
    const value = activeValues.find((item) => item.id === valueId);
    if (!value) return;
    setValueBusy(valueId);
    setNotice("");
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
      setNotice("تم حفظ تعزيز القيمة.");
    } catch {
      setNotice("تعذر حفظ النجمة الآن. أعد المحاولة.");
    } finally {
      setValueBusy("");
    }
  }

  async function removeValueStar(valueId: string) {
    if (!student) return;
    const count = store.valueStars.filter((item) => item.studentId === student.id && item.valueId === valueId).length;
    if (count < 1) return;
    setValueBusy(valueId);
    setNotice("");
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
    <main className="shell inner-shell comprehensive-assessment">
      <section className="comprehensive-student-head">
        <div className="comprehensive-student-title">
          <small>التقييم الشامل</small>
          <h1>{student.name}</h1>
          <p>{student.className}</p>
        </div>
        <div className="comprehensive-student-nav no-print">
          <Link href="/teacher/students" className="compact-link">قائمة الطلاب</Link>
          <button type="button" disabled={!previousStudent} onClick={() => goToStudent(previousStudent?.id)}>الطالب السابق</button>
          <button type="button" disabled={!nextStudent} onClick={() => goToStudent(nextStudent?.id)}>الطالب التالي</button>
        </div>
      </section>

      {notice && <div className="comprehensive-save-notice" role="status">{notice}</div>}

      <div className="comprehensive-sheet">
        <section className="comprehensive-section">
          <header className="comprehensive-section-head"><h2>المواد</h2><span>نقرة واحدة للحفظ</span></header>
          <div className="comprehensive-rows">
            {subjects.map((subject) => (
              <div className="comprehensive-row" key={subject.id}>
                <div className="comprehensive-row-label">
                  <strong>{subject.displayName}</strong>
                  <small>{subject.assessedSkills ? `${subject.assessedSkills} مهارة مسجلة` : "تقييم مختصر"}</small>
                </div>
                <div className="comprehensive-choice three-choice">
                  {subjectLevels.map((option) => (
                    <button
                      type="button"
                      className={subject.level === option.value ? `active ${option.value}` : option.value}
                      key={option.value}
                      onClick={() => saveSubjectLevel(subject.id, option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="comprehensive-section">
          <header className="comprehensive-section-head behavior-head">
            <h2>السلوك</h2>
            <div className="compact-segmented no-print">
              <button className={behaviorContext === "classroom" ? "active" : ""} type="button" onClick={() => setBehaviorContext("classroom")}>الفصل</button>
              <button className={behaviorContext === "school" ? "active" : ""} type="button" onClick={() => setBehaviorContext("school")}>المدرسة</button>
            </div>
          </header>
          <div className="comprehensive-rows behavior-rows">
            {behaviors.map(([behaviorId, title]) => {
              const current = store.behaviorEvaluations.find((item) => item.studentId === student.id && item.behaviorId === behaviorId && item.context === behaviorContext)?.level;
              return (
                <div className="comprehensive-row" key={behaviorId}>
                  <div className="comprehensive-row-label"><strong>{title}</strong></div>
                  <div className="comprehensive-choice three-choice">
                    {behaviorLevels.map((option) => (
                      <button
                        type="button"
                        className={current === option.value ? `active ${option.value}` : option.value}
                        key={option.value}
                        onClick={() => saveBehavior(behaviorId, option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="comprehensive-section">
          <header className="comprehensive-section-head"><h2>القيم</h2><span>القيم المعتمدة للصف الثاني</span></header>
          <div className="comprehensive-value-list">
            {activeValues.map((value) => {
              const count = store.valueStars.filter((item) => item.studentId === student.id && item.valueId === value.id).length;
              return (
                <div className="comprehensive-value-row" key={value.id}>
                  <div><strong>{value.title}</strong><small>{value.unitName}</small></div>
                  <div className="value-stepper no-print">
                    <button type="button" disabled={valueBusy === value.id || count < 1} onClick={() => void removeValueStar(value.id)}>−</button>
                    <b>⭐ {count}</b>
                    <button type="button" disabled={valueBusy === value.id} onClick={() => void addValueStar(value.id)}>+</button>
                  </div>
                </div>
              );
            })}
            {!activeValues.length && <div className="empty-state compact-empty">لا توجد قيم مفعلة للفصل الحالي.</div>}
          </div>
        </section>

        <section className="comprehensive-section follow-up-section">
          <header className="comprehensive-section-head"><h2>المتابعة والإجراءات</h2><span>يمكن اختيار أكثر من إجراء</span></header>
          <div className="follow-up-choice-grid no-print">
            <button type="button" className={effectiveFollowUpActions.length === 0 ? "active clear" : "clear"} onClick={clearFollowUp}>لا يحتاج متابعة</button>
            {followUpOptions.map((option) => (
              <button
                type="button"
                className={effectiveFollowUpActions.includes(option.value) ? "active" : ""}
                key={option.value}
                onClick={() => toggleFollowUp(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {legacyFollowUp && (
            <div className="existing-follow-up-summary">
              <b>متابعة محفوظة سابقًا</b>
              <span>{followUpCategoryLabels[legacyFollowUp.category]} · {followUpStatusLabels[legacyFollowUp.status]}{legacyFollowUp.nextReviewAt ? ` · ${legacyFollowUp.nextReviewAt}` : ""}</span>
            </div>
          )}

          <label className="follow-up-note no-print">
            <span>ملاحظة مختصرة <small>اختياري</small></span>
            <textarea
              value={followUpNote}
              onChange={(event) => setFollowUpNote(event.target.value)}
              onBlur={saveFollowUpNote}
              placeholder="ملاحظة قصيرة تساعدك عند الرجوع للطالب لاحقًا"
              rows={3}
            />
          </label>
          <div className="comprehensive-footer-actions no-print">
            <Link href={`/teacher/students/${student.id}/portfolio`}>ملف الإنجاز</Link>
            <Link href="/teacher/announcements">الرسائل والتواصل</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
