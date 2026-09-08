"use client";

import Link from "next/link";
import { PrintButton } from "@/components/PrintButton";
import { useTaallamt } from "@/lib/store";

export default function ReportsPage() {
  const { students, assessments, valueStars, resources } = useTaallamt();
  const active = students.filter((student) => student.active);
  const needs = assessments.filter((item) => item.level === "needs_training").length;
  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">📊</div><div><h1>التقارير والطباعة</h1><p>ملخصات الفصل وسجلات المتابعة</p></div></div><div className="mini-actions"><PrintButton label="طباعة الملخص" /><Link className="btn secondary" href="/">الرئيسية</Link></div></header>
    <section className="hero"><div><h2>ملخص الفصل</h2><p>مدخل سريع للمخرجات القابلة للطباعة دون تكرار العمل.</p></div><div className="hero-stats"><div className="stat"><b>{active.length}</b><span>طلاب</span></div><div className="stat"><b>{assessments.length}</b><span>تقييمات</span></div><div className="stat"><b>{needs}</b><span>يحتاج تدريب</span></div><div className="stat"><b>{resources.length}</b><span>موارد</span></div></div></section>
    <section className="section"><div className="grid"><Link className="card" href="/teacher/students"><div className="icon">👥</div><h3>سجلات الطلاب</h3><p>افتح الطالب ثم اطبع سجله وخطته.</p></Link><Link className="card" href="/teacher/assessment"><div className="icon">✅</div><h3>سجل المهارات</h3><p>نتائج تقييم المهارات على مستوى الفصل.</p></Link><Link className="card" href="/teacher/portfolio"><div className="icon">📁</div><h3>ملف الإنجاز</h3><p>طباعة ملف الإنجاز المهني ومراجعته.</p></Link><div className="card"><div className="icon">⭐</div><h3>التحفيز</h3><p>{valueStars.length} نجمة مسجلة في النظام.</p></div></div></section>
  </main>;
}
