"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useTaallamt } from "@/lib/store";

export default function SettingsPage() {
  const store = useTaallamt();
  const [termName, setTermName] = useState("");
  const [year, setYear] = useState("1448هـ");
  const [subjectName, setSubjectName] = useState("");
  const activeSubjects = store.subjects.filter((subject) => subject.termId === store.activeTermId);

  function addTerm(event: FormEvent) {
    event.preventDefault();
    store.addTerm(termName, year);
    setTermName("");
  }

  function addSubject(event: FormEvent) {
    event.preventDefault();
    store.addSubject(subjectName);
    setSubjectName("");
  }

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
          <div className="section-head"><h2>مواد الفصل الحالي</h2></div>
          <form className="toolbar no-print" onSubmit={addSubject}><input className="field grow" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="اسم المادة" /><button className="btn" type="submit">+ إضافة مادة</button></form>
          <div className="list section">
            {activeSubjects.map((subject) => <div className="row" key={subject.id}><div><h4>{subject.name}</h4><small>{subject.enabled ? "مفعلة" : "متوقفة"} · الترتيب {subject.order}</small></div><div className="mini-actions no-print"><button className="btn secondary" onClick={() => { const name = prompt("اسم المادة", subject.name); if (name) store.renameSubject(subject.id, name); }}>تعديل</button><button className="btn secondary" onClick={() => store.toggleSubject(subject.id)}>{subject.enabled ? "إيقاف" : "تفعيل"}</button><button className="btn danger" onClick={() => { if (confirm(`حذف مادة ${subject.name} من هذا الفصل؟`)) store.deleteSubject(subject.id); }}>حذف</button></div></div>)}
            {activeSubjects.length === 0 && <div className="notice">لا توجد مواد في الفصل الحالي. أضف المادة التي تحتاجها.</div>}
          </div>
        </div>
      </section>

      <section className="section two">
        <div className="card"><h3>قاعدة النظام</h3><p>تغيير الفصل لا يمسح الفصل السابق. لكل فصل مواد مستقلة، ويمكن إضافة أو إيقاف أو تغيير المواد لاحقًا بدون إعادة بناء الموقع.</p></div>
        <div className="card"><h3>بيانات النسخة الحالية</h3><p>التغييرات تحفظ محليًا على هذا الجهاز أثناء مرحلة البناء. قبل الاستخدام الفعلي سننقلها إلى تخزين خلفي آمن وصلاحيات حقيقية.</p><button className="btn danger no-print" style={{marginTop: 12}} onClick={() => { if (confirm("إعادة بيانات النسخة التجريبية إلى حالتها الأولى؟")) store.resetLocalData(); }}>إعادة ضبط التجربة</button></div>
      </section>
    </main>
  );
}
