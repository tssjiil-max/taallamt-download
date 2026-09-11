"use client";

import Link from "next/link";
import { academicWeek, getSchoolStatus } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import { weeklyLearningSnapshot, weeklySkillSummary } from "@/lib/weekly-learning";
import { TeacherBrandHeader, TeacherNav } from "@/components/TeacherChrome";

export default function TeacherHome() {
  const store = useTaallamt();
  const term = store.terms.find((item) => item.active) ?? store.terms[0];
  const week = academicWeek();
  const status = getSchoolStatus();
  const students = store.students.filter((item) => item.active);
  const weekly = weeklyLearningSnapshot(store.weeklyPlans, store.skills, store.subjects, week, term?.id);

  const needsAttention = students.filter((student) => {
    const actionFollowUp = Boolean(student.followUpActions?.length) || student.specialFollowUp;
    const subjectFollowUp = Object.values(student.subjectLevels).includes("needs_training");
    const skillFollowUp = store.assessments.some((assessment) => assessment.studentId === student.id && assessment.level === "needs_training");
    return actionFollowUp || subjectFollowUp || skillFollowUp;
  });

  const assessedStudentIds = new Set(store.assessments.map((assessment) => assessment.studentId));
  const guardianReplies = store.messages.filter((item) => item.author === "guardian").length;

  return (
    <main className="tc-home-page">
      <TeacherBrandHeader />

      <section className="tc-week-strip">
        <div><small>الأسبوع الحالي</small><strong>{week}</strong></div>
        <div><small>حالة الدوام</small><strong>{status.label}</strong></div>
        <div><small>الفصل</small><strong>ثاني / 4</strong></div>
      </section>

      <section className="tc-section tc-week-plan" aria-labelledby="week-plan-title">
        <header className="tc-section-head">
          <div><h2 id="week-plan-title">خطة الأسبوع</h2><p>الدرس والمهارة من الدليل والتوزيع المعتمد</p></div>
          <span>الأسبوع {week}</span>
        </header>
        <div className="tc-plan-list">
          {weekly.map((item) => (
            <article className="tc-plan-row" key={item.subjectId}>
              <b>{item.subjectName}</b>
              <div><strong>{item.lesson}</strong><small>{weeklySkillSummary(item)}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="tc-section tc-attention" aria-labelledby="attention-title">
        <header className="tc-section-head">
          <div><h2 id="attention-title">يحتاج عملًا الآن</h2><p>الطلاب الذين لديهم متابعة أو مهارة تحتاج دعمًا</p></div>
          <span>{needsAttention.length}</span>
        </header>
        {needsAttention.length ? (
          <div className="tc-student-focus-list">
            {needsAttention.slice(0, 10).map((student) => (
              <Link href={`/teacher/students/${student.id}/assessment`} key={student.id}>
                <div><b>{student.name}</b><small>{student.className}</small></div>
                <span>فتح الملف ‹</span>
              </Link>
            ))}
            {needsAttention.length > 10 && <Link className="tc-view-all" href="/teacher/students">عرض جميع الطلاب الذين يحتاجون متابعة</Link>}
          </div>
        ) : (
          <div className="tc-empty">لا يوجد طالب يحتاج تدخلاً مسجلاً حاليًا.</div>
        )}
      </section>

      <section className="tc-class-line" aria-label="ملخص الفصل">
        <span><b>{students.length}</b> طالب</span>
        <span><b>{assessedStudentIds.size}</b> تم تقييمهم</span>
        <span><b>{guardianReplies}</b> رد ولي أمر</span>
      </section>

      <footer className="tc-credit">برمجة سلطان الصاعدي</footer>
      <TeacherNav />
    </main>
  );
}
