"use client";

import Link from "next/link";
import { useTaallamt } from "@/lib/store";
import { academicWeek, dailyBreakdown, plansForWeek, tomorrowAnnouncement } from "@/lib/schedule";

export default function SchedulePage() {
  const store = useTaallamt();
  const week = academicWeek();
  const plans = plansForWeek(store.weeklyPlans, week);
  const tomorrow = tomorrowAnnouncement(store.weeklyPlans, store.subjects);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🗓️</div><div><h1>الخطة والنشر الآلي</h1><p>خطة أسبوعية لولي الأمر + إعلان يومي عن الغد</p></div></div>
        <Link className="btn secondary no-print" href="/">لوحة المعلم</Link>
      </header>

      <section className="hero">
        <div><h2>الأسبوع {week}</h2><p>تظهر خطة الأسبوع تلقائيًا لولي الأمر من بداية يوم السبت، ويتغير إعلان «ماذا لدينا غدًا؟» يوميًا حسب التاريخ.</p></div>
        <div className="hero-stats"><div className="stat"><b>السبت</b><span>فتح الخطة الأسبوعية</span></div><div className="stat"><b>{tomorrow.tomorrow}</b><span>إعلان الغد</span></div><div className="stat"><b>{plans.length}</b><span>مواد هذا الأسبوع</span></div><div className="stat"><b>تلقائي</b><span>التحديث حسب التاريخ</span></div></div>
      </section>

      <section className="section">
        <div className="section-head"><h2>خطة الأسبوع</h2></div>
        <div className="grid">
          {plans.map((plan) => {
            const subject = store.subjects.find((s) => s.id === plan.subjectId);
            return <div className="card" key={plan.id}><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></div>;
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>التقسيم اليومي</h2></div>
        <div className="list">
          {plans.filter((p) => ["quran", "lughati"].includes(p.subjectId)).flatMap((plan) => dailyBreakdown(plan).map((item) => (
            <div className="row" key={`${plan.id}-${item.day}`}><div><h4>{item.day}</h4><small>{item.title}</small></div></div>
          )))}
        </div>
        <div className="notice warn section">تقسيم القرآن يُشتق من مقطع الآيات الأسبوعي. تقسيم لغتي الحالي قالب تشغيلي مبدئي قابل للتعديل عند إدخال التوزيع اليومي الرسمي أو جدول الحصص.</div>
      </section>

      <section className="section">
        <div className="section-head"><h2>معاينة إعلان الغد</h2></div>
        <div className="card"><h3>غدًا {tomorrow.tomorrow}</h3>{tomorrow.items.length ? <ul>{tomorrow.items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>لا يوجد تفصيل يومي محفوظ للغد بعد.</p>}{tomorrow.weeklyOnly.length > 0 && <><h3 className="section">مواد بخطة أسبوعية فقط</h3><ul>{tomorrow.weeklyOnly.map((item) => <li key={item}>{item}</li>)}</ul></>}</div>
      </section>

      <section className="section"><div className="notice">هذه المرحلة تجعل المحتوى يظهر تلقائيًا حسب اليوم عند فتح الموقع. الإشعار المدفوع الذي يصل للجوال دون فتح الموقع سيُربط لاحقًا مع التخزين الخلفي وخدمة الإشعارات.</div></section>
    </main>
  );
}
