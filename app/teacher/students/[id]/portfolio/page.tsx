"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { ShareButton } from "@/components/ShareButton";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel, SkillAssessment } from "@/lib/types";

const labels: Record<MasteryLevel, string> = { mastered: "أتقن", partial: "يتقدم", needs_training: "يحتاج تدريب" };

export default function TeacherStudentPortfolioPage() {
  const params = useParams<{ id: string }>();
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === params.id);

  if (!student) return <main className="shell"><div className="notice warn">الطالب غير موجود.</div><Link className="btn section" href="/teacher/students">العودة للطلاب</Link></main>;

  const subjects = store.subjects.filter((item) => item.enabled && item.termId === store.activeTermId).sort((a, b) => a.order - b.order);
  const skills = store.skills.filter((item) => item.active && item.termId === store.activeTermId);
  const assessments = store.assessments.filter((item) => item.studentId === student.id && item.termId === store.activeTermId);
  const latest = new Map<string, SkillAssessment>();
  assessments.forEach((item) => {
    const old = latest.get(item.skillId);
    if (!old || old.assessedAt < item.assessedAt) latest.set(item.skillId, item);
  });
  const latestValues = Array.from(latest.values());
  const mastered = latestValues.filter((item) => item.level === "mastered").length;
  const needs = latestValues.filter((item) => item.level === "needs_training").length;
  const stars = store.valueStars.filter((item) => item.studentId === student.id);
  const studentResources = store.resources.slice(0, 10);
  const completion = Math.round(([latestValues.length > 0, stars.length > 0, studentResources.length > 0, assessments.length > 0].filter(Boolean).length / 4) * 100);

  return <main className="shell inner-shell student-portfolio-page">
    <section className="inner-section portfolio-cover student-portfolio-cover">
      <div className="portfolio-cover-copy"><small>تعلّمت · ملف إنجاز الطالب</small><h1>{student.name}</h1><p>{student.className}</p><p>الفصل الدراسي الأول · 1448هـ</p></div>
      <div className="portfolio-progress"><b>{completion}%</b><span>اكتمال الملف</span></div>
    </section>

    <section className="inner-section no-print"><div className="inner-section-head"><div><h2>ملخص الإنجاز</h2><span>يتجمع تلقائيًا من عمل المعلم اليومي</span></div><div className="mini-actions"><PrintButton label="طباعة / PDF"/><ShareButton title={`ملف إنجاز الطالب ${student.name}`} text="ملف إنجاز الطالب في منصة تعلّمت"/></div></div><div className="portfolio-stats-grid"><article><b>{mastered}</b><span>مهارة متقنة</span></article><article><b>{latestValues.length}</b><span>مهارة مقيّمة</span></article><article><b>{stars.length}</b><span>نجمة</span></article><article><b>{needs}</b><span>تحتاج تدريب</span></article></div></section>

    <section className="inner-section"><div className="inner-section-head"><div><h2>التقدم حسب المواد</h2><span>مبني على آخر تقييم لكل مهارة</span></div></div><div className="portfolio-subject-grid">{subjects.map((subject) => { const subjectSkills = skills.filter((skill) => skill.subjectId === subject.id); const subjectResults = subjectSkills.map((skill) => latest.get(skill.id)).filter(Boolean) as SkillAssessment[]; const subjectMastered = subjectResults.filter((item) => item.level === "mastered").length; return <article key={subject.id}><div className="portfolio-subject-icon">★</div><div><b>{subject.name}</b><small>{subjectResults.length ? `${subjectMastered} من ${subjectResults.length} مهارة متقنة` : "لم يبدأ التقييم"}</small></div></article>; })}</div></section>

    <section className="inner-section"><div className="inner-section-head"><div><h2>الشواهد المهارية</h2><span>آخر تقييم مسجل لكل مهارة</span></div></div><div className="list">{skills.filter((skill) => latest.has(skill.id)).map((skill) => { const assessment = latest.get(skill.id)!; const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{skill.title}</h4><small>{subject?.name || "المادة"} · {skill.category}</small></div><span className={`badge ${assessment.level === "needs_training" ? "warn" : ""}`}>{labels[assessment.level]}</span></div>; })}{!latestValues.length && <div className="empty-state">ستظهر الشواهد بعد أول تقييم للطالب.</div>}</div></section>

    <section className="inner-section"><div className="inner-section-head"><div><h2>النجوم والقيم</h2><span>شواهد السلوك والتحفيز</span></div></div><div className="student-star-wall">{stars.slice(-12).reverse().map((star) => { const value = store.values.find((item) => item.id === star.valueId); return <article key={star.id}><span>★</span><div><b>{value?.title || "سلوك إيجابي"}</b><small>{new Date(star.awardedAt).toLocaleDateString("ar-SA")}</small></div></article>; })}{!stars.length && <div className="empty-state">لم تُمنح نجوم بعد.</div>}</div></section>

    <section className="inner-section"><div className="inner-section-head"><div><h2>أعمال وشواهد التعلم</h2><span>المواد التعليمية المرتبطة بالفصل</span></div></div><div className="portfolio-work-grid">{studentResources.map((resource) => <article className="card" key={resource.id}><b>{resource.title}</b><small>{resource.instructions || "مادة تعليمية"}</small></article>)}{!studentResources.length && <div className="empty-state">لا توجد أعمال مضافة بعد.</div>}</div></section>

    <section className="inner-section portfolio-message"><img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو"/><div><h2>ملف يتحدث تلقائيًا</h2><p>كل تقييم أو نجمة أو مورد جديد ينعكس في ملف الإنجاز دون إعادة إدخال البيانات.</p></div></section>

    <div className="mini-actions no-print section"><Link className="btn secondary" href={`/teacher/students/${student.id}`}>العودة لملف الطالب</Link><Link className="btn" href="/teacher/students">جميع الطلاب</Link></div>
  </main>;
}
