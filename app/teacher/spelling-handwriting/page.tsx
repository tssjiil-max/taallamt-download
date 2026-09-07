"use client";

import Link from "next/link";
import { useState } from "react";
import { DateBar } from "@/components/DateBar";
import { PrintButton } from "@/components/PrintButton";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

export default function SpellingHandwritingPage() {
  const store = useTaallamt();
  const [week, setWeek] = useState(academicWeek());
  const practice = store.spellingPractices.find((item) => item.active && item.termId === store.activeTermId && item.week === week);

  return (
    <main className="shell">
      <header className="topbar no-print"><div className="brand"><div className="logo">✍️</div><div><h1>الإملاء والخط</h1><p>مسار أسبوعي داخل مادة لغتي</p></div></div><Link className="btn secondary" href="/">لوحة المعلم</Link></header>
      <div className="no-print"><DateBar /></div>
      <section className="hero section"><div><h2>كتيب الإملاء والخط داخل تعلّمت</h2><p>تم ربط التوزيع الأسبوعي للكتيب بالنظام، بحيث تظهر مهارة الأسبوع للمعلم وولي الأمر وتدخل لاحقًا في التقييم والخطة العلاجية.</p></div><div className="hero-stats"><div className="stat"><b>10</b><span>درجة الإملاء</span></div><div className="stat"><b>4</b><span>سطور الخط</span></div><div className="stat"><b>17</b><span>أسبوعًا</span></div><div className="stat"><b>لغتي</b><span>ليست مادة مستقلة</span></div></div></section>

      <section className="section no-print"><div className="card"><div className="toolbar"><label>الأسبوع</label><select className="field" value={week} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>الأسبوع {item}</option>)}</select><PrintButton label="طباعة خطة الأسبوع" /><Link className="btn green" href="/teacher/resources">إنشاء تدريب/ورقة عمل</Link></div></div></section>

      {practice ? <section className="section"><div className="card"><div className="section-head"><h2>الأسبوع {practice.week} — {practice.unitName}</h2><span className="badge">من {practice.scoreTotal}</span></div><div className="kv"><span>مهارة الإملاء</span><b>{practice.skill}</b></div><h3 className="section">معايير الخط</h3><ul>{practice.handwritingChecklist.map((item) => <li key={item} style={{ marginBottom: 9 }}>{item}</li>)}</ul><div className="notice section">نمط التدريب المعتمد من الكتيب: تتبع النموذج، ثم النسخ مع النظر، ثم الكتابة المستقلة مع المحافظة على السطور الأربعة.</div></div></section> : <div className="notice section">لا يوجد تدريب مسجل لهذا الأسبوع.</div>}

      <section className="section"><div className="section-head"><h2>خريطة الفصل</h2></div><div className="list">{store.spellingPractices.filter((item) => item.termId === store.activeTermId).map((item) => <button type="button" className="row" key={item.id} onClick={() => setWeek(item.week)}><div className="row-main"><div className="avatar">{item.week}</div><div><h4>{item.skill}</h4><small>{item.unitName}</small></div></div><span className="badge">فتح</span></button>)}</div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
