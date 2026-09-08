"use client";

import { PrintButton } from "@/components/PrintButton";
import { ShareButton } from "@/components/ShareButton";
import { useTaallamt } from "@/lib/store";

const sections = [
  ["👤","السيرة الذاتية","البيانات المهنية والمؤهلات والخبرات."],
  ["🧭","الرؤية والرسالة والقيم","الرؤية المهنية والرسالة والقيم التي توجه العمل."],
  ["🎯","أهداف المعلم","الأهداف المهنية والتعليمية خلال العام."],
  ["🇸🇦","أهداف سياسة التعليم بالمملكة","مرجعية أهداف سياسة التعليم بالمملكة العربية السعودية."],
  ["🤝","ميثاق أخلاقيات مهنة التعليم","المبادئ والمسؤوليات المهنية للمعلم."],
  ["🎓","الدورات التدريبية والورش","إضافة الشهادات والدورات والورش وتوثيقها."],
  ["🎤","المؤتمرات والملتقيات","المشاركات والحضور والأدلة المرتبطة بها."],
  ["🔗","العضويات العلمية","العضويات المهنية والعلمية."],
  ["🏆","الجوائز والإنجازات","الجوائز والإنجازات والمبادرات المتميزة."],
  ["💐","شهادات الشكر والتقدير","حفظ شهادات الشكر والتقدير كأدلة."],
  ["🪞","التقويم الذاتي","تأمل مهني ونقاط القوة وفرص التحسين."],
  ["📝","نماذج أوراق العمل","يجمع النظام نماذج من أوراق العمل المسجلة."],
  ["📋","نماذج من الاختبارات","يجمع النظام نماذج من الاختبارات المسجلة."],
  ["🌟","مشاركات المعلم","الأنشطة والمبادرات والصور والأعمال التي تريد توثيقها."],
] as const;

export default function PortfolioPage() {
  const { resources, students, subjects, terms } = useTaallamt();
  const activeTerm = terms.find(t=>t.active) ?? terms[0];
  const activeSubjects = subjects.filter(s=>s.enabled && s.termId===activeTerm?.id);
  const worksheets = resources.filter(r=>r.kind==="worksheet" || r.kind==="skills_practice").length;
  const tests = resources.filter(r=>r.kind==="midterm" || r.kind==="final").length;
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">📁</div><div><h1>ملف إنجاز المعلم</h1><p>يتكوّن من بياناتك وأعمالك وأدلتك المسجلة في تعلّمت</p></div></div><div className="mini-actions"><PrintButton label="طباعة الملف" /><ShareButton title="ملف إنجاز المعلم" text="ملف إنجاز المعلم من منصة تعلّمت" /></div></header>
    <section className="hero"><div><h2>ملف الإنجاز المهني</h2><p>أدخل البيانات الثابتة مرة واحدة، ويجمع النظام الأعمال التعليمية المسجلة تلقائيًا كلما أمكن.</p></div><div className="hero-stats"><div className="stat"><b>{activeSubjects.length}</b><span>مواد</span></div><div className="stat"><b>{students.filter(s=>s.active).length}</b><span>طالبًا</span></div><div className="stat"><b>{worksheets}</b><span>أوراق موثقة</span></div><div className="stat"><b>{tests}</b><span>اختبارات موثقة</span></div></div></section>
    <section className="section"><div className="section-head"><div><h2>المحتويات المعتمدة</h2><p>هذه هي أقسام ملف الإنجاز المعتمدة. الإضافة اليدوية للأدلة والملفات ستكون من داخل القسم المناسب.</p></div></div><div className="grid">{sections.map(([icon,title,text])=><article className="card" key={title}><div className="icon">{icon}</div><h3>{title}</h3><p>{text}</p>{title==="نماذج أوراق العمل" && <span className="pill">{worksheets} مسجل</span>}{title==="نماذج من الاختبارات" && <span className="pill">{tests} مسجل</span>}</article>)}</div></section>
  </main>;
}
