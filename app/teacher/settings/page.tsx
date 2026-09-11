"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTaallamt } from "@/lib/store";

export default function SettingsPage() {
  const store = useTaallamt();
  const [termName, setTermName] = useState("");
  const [year, setYear] = useState("1448هـ");
  const [profile, setProfile] = useState({ teacher: "سلطان الصاعدي", school: "مدرسة عمرو بن أوس الثقفي", className: "الصف الثاني / 4" });
  const [notice, setNotice] = useState("");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const activeSubjects = store.subjects.filter((subject) => subject.termId === store.activeTermId);

  function addTerm(event: FormEvent) {
    event.preventDefault();
    store.addTerm(termName, year);
    setTermName("");
    setNotice("تمت إضافة الفصل الدراسي.");
  }

  useEffect(() => {
    const saved = localStorage.getItem("taallamt-teacher-profile");
    if (!saved) return;
    try { setProfile(JSON.parse(saved)); } catch {}
  }, []);

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("taallamt-teacher-profile", JSON.stringify(profile));
    setNotice("تم حفظ بيانات المعلم والمدرسة.");
  }

  function resetDemo() {
    store.resetLocalData();
    setResetConfirmOpen(false);
    setNotice("تمت إعادة بيانات النسخة التجريبية إلى حالتها الأولى.");
  }

  return (
    <main className="shell">
      {notice && <div className="notice" role="status">{notice}</div>}

      <section className="two">
        <div className="card">
          <div className="section-head"><h2>الفصول الدراسية</h2></div>
          <form className="stack no-print" onSubmit={addTerm}>
            <input className="field" value={termName} onChange={(e) => setTermName(e.target.value)} placeholder="مثال: الفصل الدراسي الثاني" />
            <div className="toolbar"><input className="field" value={year} onChange={(e) => setYear(e.target.value)} placeholder="العام الدراسي" /><button className="btn" type="submit">+ فصل جديد</button></div>
          </form>
          <div className="list section">
            {store.terms.map((term) => <div className="row" key={term.id}><div><h4>{term.name}</h4><small>{term.academicYear}</small></div>{term.active ? <span className="badge">الحالي</span> : <button className="btn secondary no-print" type="button" onClick={() => { store.activateTerm(term.id); setNotice(`تم اعتماد ${term.name} كفصل حالي.`); }}>جعله الحالي</button>}</div>)}
          </div>
        </div>

        <div className="card">
          <div className="section-head"><h2>المواد الأربع</h2></div>
          <div className="list section">
            {activeSubjects.slice().sort((a,b)=>a.order-b.order).map((subject) => <div className="row" key={subject.id}><div><h4>{subject.name}</h4><small>مادة أساسية · الترتيب {subject.order}</small></div><span className="badge">مفعلة</span></div>)}
          </div>
        </div>
      </section>

      <section className="section card">
        <div className="section-head"><h2>بيانات المعلم والمدرسة</h2></div>
        <form className="stack" onSubmit={saveProfile}>
          <input className="field" value={profile.teacher} onChange={e=>setProfile({...profile,teacher:e.target.value})} placeholder="اسم المعلم" />
          <input className="field" value={profile.school} onChange={e=>setProfile({...profile,school:e.target.value})} placeholder="اسم المدرسة" />
          <input className="field" value={profile.className} onChange={e=>setProfile({...profile,className:e.target.value})} placeholder="الفصل" />
          <button className="btn" type="submit">حفظ البيانات</button>
        </form>
      </section>

      <section className="section card">
        <h3>نسخة زميل أو فصل آخر</h3>
        <p>البنية جاهزة لنسخة مستقلة ببيانات وصلاحيات منفصلة. لن تُنشأ بيانات افتراضية قبل توفر بيانات النسخة.</p>
        <button className="btn secondary" type="button" disabled>بانتظار بيانات النسخة</button>
      </section>

      <section className="section two">
        <div className="card"><h3>قاعدة النظام</h3><p>تغيير الفصل لا يمسح الفصل السابق. لكل فصل مواد مستقلة، ويمكن إضافة أو إيقاف أو تغيير المواد لاحقًا بدون إعادة بناء الموقع.</p></div>
        <div className="card">
          <h3>بيانات النسخة الحالية</h3>
          <p>إعادة الضبط مخصصة للنسخة التجريبية فقط، ولا تُنفذ إلا بعد تأكيدك داخل الصفحة.</p>
          {!resetConfirmOpen ? (
            <button className="btn danger no-print" style={{ marginTop: 12 }} type="button" onClick={() => setResetConfirmOpen(true)}>إعادة ضبط التجربة</button>
          ) : (
            <div className="inline-confirm no-print" role="dialog" aria-label="تأكيد إعادة ضبط التجربة">
              <div><b>إعادة بيانات النسخة التجريبية؟</b><small>سيتم إرجاع البيانات المحلية إلى الحالة الأولى.</small></div>
              <div className="mini-actions"><button className="btn danger" type="button" onClick={resetDemo}>تأكيد إعادة الضبط</button><button className="btn secondary" type="button" onClick={() => setResetConfirmOpen(false)}>إلغاء</button></div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
