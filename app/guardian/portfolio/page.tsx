"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PrintButton } from "@/components/PrintButton";
import { ShareButton } from "@/components/ShareButton";
import { guardianMe } from "@/lib/guardian-api";
import type { LearningResource, MasteryLevel, Message, Skill, SkillAssessment, Subject, Term, ValueStar, ValueTarget, WeeklyPlan } from "@/lib/types";

type Profile = { preferredName?: string; photoDataUrl?: string; interests?: string; strengths?: string };
type Bundle = {
  student: { id: string; name: string; className: string; subjectLevels: Record<string, MasteryLevel> };
  profile: Profile | null;
  activeTerm: Term | null;
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  assessments: SkillAssessment[];
  resources: Array<Omit<LearningResource, "answerGuide">>;
  values: ValueTarget[];
  valueStars: ValueStar[];
  messages: Message[];
};

const levelLabel: Record<MasteryLevel, string> = { mastered: "أتقن", partial: "يتقدم", needs_training: "يحتاج تدريب" };

export default function StudentPortfolioPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    guardianMe<Bundle>().then(setBundle).catch(() => setError("تعذر فتح ملف الإنجاز الآن."));
  }, []);

  const stats = useMemo(() => {
    if (!bundle) return { mastered: 0, needs: 0, assessed: 0, stars: 0, awards: 0 };
    const latest = new Map<string, SkillAssessment>();
    for (const item of bundle.assessments) {
      const old = latest.get(item.skillId);
      if (!old || old.assessedAt < item.assessedAt) latest.set(item.skillId, item);
    }
    const values = Array.from(latest.values());
    const mastered = values.filter((item) => item.level === "mastered").length;
    const needs = values.filter((item) => item.level === "needs_training").length;
    return { mastered, needs, assessed: values.length, stars: bundle.valueStars.length, awards: Math.floor(bundle.valueStars.length / 30) };
  }, [bundle]);

  if (error) return <main className="shell"><div className="notice warn">{error}</div><Link className="btn section" href="/guardian">العودة لصفحة الطالب</Link></main>;
  if (!bundle) return <main className="shell"><div className="empty-state">جاري إعداد ملف الإنجاز…</div></main>;

  const student = bundle.student;
  const name = bundle.profile?.preferredName || student.name;
  const subjects = bundle.subjects.filter((item) => item.enabled !== false).sort((a, b) => a.order - b.order);
  const latestAssessments = [...bundle.assessments].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt)).slice(0, 12);
  const recentStars = [...bundle.valueStars].sort((a, b) => b.awardedAt.localeCompare(a.awardedAt)).slice(0, 12);
  const resources = bundle.resources.slice(0, 10);
  const completedSections = [stats.assessed > 0, stats.stars > 0, resources.length > 0, bundle.weeklyPlans.length > 0].filter(Boolean).length;
  const completion = Math.round((completedSections / 4) * 100);

  return (
    <main className="shell guardian-shell student-portfolio-page">
      <section className="inner-section portfolio-cover student-portfolio-cover">
        <div className="portfolio-cover-copy">
          <small>تعلّمت · ملف إنجاز الطالب</small>
          <h1>{name}</h1>
          <p>{student.className}</p>
          <p>الفصل الدراسي الأول · 1448هـ</p>
        </div>
        <div className="portfolio-progress"><b>{completion}%</b><span>اكتمال الملف</span></div>
      </section>

      <section className="inner-section no-print">
        <div className="inner-section-head"><div><h2>ملفي</h2><span>يتحدث تلقائيًا من تقييمات المعلم وأعمال الطالب</span></div><div className="mini-actions"><PrintButton label="طباعة / PDF"/><ShareButton title={`ملف إنجاز الطالب ${name}`} text="ملف إنجاز الطالب في منصة تعلّمت"/></div></div>
        <div className="portfolio-stats-grid">
          <article><b>{stats.mastered}</b><span>مهارة متقنة</span></article>
          <article><b>{stats.assessed}</b><span>مهارة مقيّمة</span></article>
          <article><b>{stats.stars}</b><span>نجمة</span></article>
          <article><b>{stats.awards}</b><span>جائزة</span></article>
        </div>
      </section>

      <section className="inner-section">
        <div className="inner-section-head"><div><h2>تقدمي في المواد</h2><span>آخر مستوى مسجل في كل مادة</span></div></div>
        <div className="portfolio-subject-grid">{subjects.map((subject) => {
          const level = student.subjectLevels[subject.id];
          return <article key={subject.id}><div className="portfolio-subject-icon">★</div><div><b>{subject.name}</b><small>{level ? levelLabel[level] : "لم يبدأ التقييم"}</small></div></article>;
        })}</div>
      </section>

      <section className="inner-section">
        <div className="inner-section-head"><div><h2>إنجازاتي المهارية</h2><span>آخر التقييمات المسجلة</span></div><span className={`badge ${stats.needs ? "warn" : ""}`}>{stats.mastered} متقنة</span></div>
        <div className="list">{latestAssessments.map((assessment) => {
          const skill = bundle.skills.find((item) => item.id === assessment.skillId);
          const subject = skill ? subjects.find((item) => item.id === skill.subjectId) : undefined;
          return <div className="row" key={assessment.id}><div><h4>{skill?.title || "مهارة"}</h4><small>{subject?.name || "المادة"} · {skill?.category || "تقييم"}</small></div><span className={`badge ${assessment.level === "needs_training" ? "warn" : ""}`}>{levelLabel[assessment.level]}</span></div>;
        })}{!latestAssessments.length && <div className="empty-state">ستظهر المهارات هنا بعد أول تقييم.</div>}</div>
      </section>

      <section className="inner-section">
        <div className="inner-section-head"><div><h2>نجومي وقيمي</h2><span>الشواهد الإيجابية التي منحها المعلم</span></div></div>
        <div className="student-star-wall">{recentStars.length ? recentStars.map((star) => {
          const value = bundle.values.find((item) => item.id === star.valueId);
          return <article key={star.id}><span>★</span><div><b>{value?.title || "سلوك إيجابي"}</b><small>{new Date(star.awardedAt).toLocaleDateString("ar-SA")}</small></div></article>;
        }) : <div className="empty-state">ستظهر النجوم هنا عند منحها للطالب.</div>}</div>
      </section>

      <section className="inner-section">
        <div className="inner-section-head"><div><h2>أعمالي وشواهدي</h2><span>المصادر والأعمال المرتبطة بتعلمي</span></div></div>
        <div className="portfolio-work-grid">{resources.map((resource) => <Link href={`/guardian/resources/${resource.id}`} key={resource.id}><span>▤</span><div><b>{resource.title}</b><small>{resource.instructions || "مادة تعليمية"}</small></div></Link>)}{!resources.length && <div className="empty-state">ستظهر الأعمال المختارة هنا عند إضافتها للمكتبة.</div>}</div>
      </section>

      <section className="inner-section portfolio-message">
        <img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" />
        <div><h2>كل تقدم صغير إنجاز كبير</h2><p>ملف الإنجاز يتحدث تلقائيًا كلما تعلمت مهارة جديدة أو حصلت على نجمة أو أضاف المعلم عملًا جديدًا.</p></div>
      </section>

      <div className="mini-actions no-print section"><Link className="btn secondary" href="/guardian">العودة لصفحة الطالب</Link><Link className="btn" href="/guardian/profile">معلومات الطالب</Link></div>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
