"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTaallamt } from "@/lib/store";

export default function SubjectWorkspace() {
  const params = useParams<{ id: string }>();
  const { subjects, terms, students, weeklyPlans, skills, assessments } = useTaallamt();
  const subject = subjects.find(s => s.id === params.id);
  const term = terms.find(t => t.active) ?? terms[0];
  const activeStudents = students.filter(s => s.active);
  const plans = weeklyPlans.filter(p => p.subjectId === params.id && p.termId === term?.id).sort((a,b)=>a.week-b.week);
  const currentWeek = plans[0]?.week ?? 1;
  const currentPlan = plans.find(p => p.week === currentWeek);
  const currentSkills = skills.filter(s => s.subjectId === params.id && s.week === currentWeek && s.active);
  const skillIds = new Set(currentSkills.map(s=>s.id));
  const latest = assessments.filter(a=>skillIds.has(a.skillId));
  const mastered = latest.filter(a=>a.level==="mastered").length;
  const partial = latest.filter(a=>a.level==="partial").length;
  const needs = latest.filter(a=>a.level==="needs_training").length;
  if (!subject) return <main className="shell"><section className="card"><h2>المادة غير موجودة</h2><Link href="/">العودة للرئيسية</Link></section></main>;
  const isLughati = subject.name.includes("لغتي");
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">{isLughati ? "✏️" : subject.name.includes("قرآن") ? "📖" : "🕌"}</div><div><h1>{subject.name}</h1><p>كل ما يخص المادة في مكان واحد</p></div></div><Link className="button ghost" href="/">الرئيسية</Link></header>
    <section className="hero"><div><h2>الأسبوع {currentWeek}{currentPlan ? ` — ${currentPlan.title}` : ""}</h2><p>{currentSkills.length ? `مهارات هذا الأسبوع: ${currentSkills.map(s=>s.title).join("، ")}` : "اختر المهارات وخطة الأسبوع من التقييم والتوزيع."}</p></div><div className="hero-stats"><div className="stat"><b>{activeStudents.length}</b><span>طالب</span></div><div className="stat"><b>{mastered}</b><span>متقن</span></div><div className="stat"><b>{partial}</b><span>أتقن البعض</span></div><div className="stat"><b>{needs}</b><span>يحتاج تدريب</span></div></div></section>
    <section className="section"><div className="section-head"><h2>العمل في {subject.name}</h2></div><div className="grid">
      <Link className="card" href={`/teacher/assessment?subject=${subject.id}`}><div className="icon">👥</div><h3>الطلاب والتقييم</h3><p>أسماء الفصل وتقييم المهارات: متقن، أتقن البعض، يحتاج تدريب.</p></Link>
      <Link className="card" href="/teacher/schedule"><div className="icon">🗓️</div><h3>خطة الأسبوع</h3><p>الدرس الحالي والتوزيع وما سيُنشر للطالب وولي الأمر.</p></Link>
      <Link className="card" href={`/teacher/assessment?subject=${subject.id}`}><div className="icon">🎯</div><h3>المهارات</h3><p>عرض مهارات المادة وحالة الفصل في كل مهارة.</p></Link>
      <Link className="card" href="/teacher/resources"><div className="icon">📝</div><h3>الأوراق والاختبارات</h3><p>إنشاء وتوثيق أوراق العمل والتدريبات والاختبارات.</p></Link>
      {isLughati && <Link className="card" href="/teacher/spelling-handwriting"><div className="icon">✍️</div><h3>الإملاء والخط</h3><p>المهارة وتعريفها وأمثلتها ومعايير الخط والدرجة.</p></Link>}
      {isLughati && <Link className="card" href="/teacher/values"><div className="icon">⭐</div><h3>القيم</h3><p>قيم الوحدة ونجوم الطلاب والتحفيز.</p></Link>}
      <Link className="card" href="/teacher/library"><div className="icon">📚</div><h3>مكتبة المادة</h3><p>الكتيبات والملفات المنشورة لولي الأمر.</p></Link>
    </div></section>
  </main>;
}
