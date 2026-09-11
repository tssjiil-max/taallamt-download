"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useTaallamt } from "@/lib/store";

export default function SettingsPage() {
  const store = useTaallamt();
  const [termName, setTermName] = useState("");
  const [year, setYear] = useState("1448هـ");
  const [profile, setProfile] = useState({teacher:"سلطان الصاعدي",school:"مدرسة عمرو بن أوس الثقفي",className:"الصف الثاني / 4"});
  const activeSubjects = store.subjects.filter((subject) => subject.termId === store.activeTermId);

  function addTerm(event: FormEvent) {
    event.preventDefault();
    store.addTerm(termName, year);
    setTermName("");
  }

  useEffect(()=>{const saved=localStorage.getItem("taallamt-teacher-profile");if(saved) setProfile(JSON.parse(saved));},[]);
  function saveProfile(event:FormEvent){event.preventDefault();localStorage.setItem("taallamt-teacher-profile",JSON.stringify(profile));alert("تم حفظ بيانات النسخة");}

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">⚙️</div><div><h1>إدارة الفصل</h1><p>الفصول والمواد قابلة للتغيير في أي وقت</p></div></div>
        <Link className="btn secondary no-print" href="/">الرئيسية</Link>
      </header>

      <section className="two">
        <div className="card">
          <div className="section-head"><h2>الفصول الدراسية</h2></div>
          <form className="stack no-print" onSubmit={addTerm}>
            <input className="field" value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="مثال: الفصل الدراسي الثاني" />
            <div className="toolbar"><input className="field" value={year} onChange={(e) => setYear(e.target.value)} placeholder="العام الدراسي" /><button className="btn" type="submit">+ فصل جديد</button></div>
          </form>
          <div className="list section">
            {store.terms.map((term) => <div className="row" key={term.id}><div><h4>{term.name}</h4><small>{term.academicYear}</small></div>{term.active ? <span className="badge">الحالي</span> : <button className="btn secondary no-print" onClick={() => store.activateTerm(term.id)}>جعله الحالي</button>}</div>)}
          </div>
        </div>

        <div className="card">
          <div className="section-head"><h2>المواد الأربع</h2></div>
          <div className="list section">
            {activeSubjects.slice().sort((a,b)=>a.order-b.order).map((subject) => <div className="row" key={subject.id}><div><h4>{subject.name}</h4><small>مادة أساسية · الترتيب {subject.order}</small></div><span className="badge">مفعلة</span></div>)}
          </div>
        </div>
      </section>

      <section className="section card"><div className="section-head"><h2>بيانات المعلم والمدرسة</h2></div><form className="stack" onSubmit={saveProfile}><input className="field" value={profile.teacher} onChange={e=>setProfile({...profile,teacher:e.target.value})} placeholder="اسم المعلم"/><input className="field" value={profile.school} onChange={e=>setProfile({...profile,school:e.target.value})} placeholder="اسم المدرسة"/><input className="field" value={profile.className} onChange={e=>setProfile({...profile,className:e.target.value})} placeholder="الفصل"/><button className="btn" type="submit">حفظ البيانات</button></form></section>
      <section className="section card"><h3>نسخة زميل أو فصل آخر</h3><p>البنية جاهزة لنسخة مستقلة ببيانات وصلاحيات منفصلة. لن تُنشأ بيانات افتراضية قبل توفر بيانات النسخة.</p><button className="btn secondary" type="button" disabled>بانتظار بيانات النسخة</button></section>

      <section className="section two">
        <div className="card"><h3>قاعدة النظام</h3><p>تغيير الفصل لا يمسح الفصل السابق. لكل فصل مواد مستقلة، ويمكن إضافة أو إيقاف أو تغيير المواد لاحقًا بدون إعادة بناء الموقع.</p></div>
        <div className="card"><h3>بيانات النسخة الحالية</h3><p>التغييرات تحفظ محليًا على هذا الجهاز أثناء مرحلة البناء. قبل الاستخدام الفعلي سننقلها إلى تخزين خلفي آمن وصلاحيات حقيقية.</p><button className="btn danger no-print" style={{marginTop: 12}} onClick={() => { if (confirm("إعادة بيانات النسخة التجريبية إلى حالتها الأولى؟")) store.resetLocalData(); }}>إعادة ضبط التجربة</button></div>
      </section>
    </main>
  );
}
