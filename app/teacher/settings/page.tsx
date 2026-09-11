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
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyProfile, setCopyProfile] = useState({ teacher: "", school: "", className: "" });
  const activeSubjects = store.subjects.filter((subject) => subject.termId === store.activeTermId);

  function addTerm(event: FormEvent) {
    event.preventDefault();
    store.addTerm(termName, year);
    setTermName("");
    setNotice("تمت إضافة الفصل الدراسي.");
  }

  useEffect(() => {
    const saved = localStorage.getItem("taallamt-teacher-profile");
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    }
    const savedCopy = localStorage.getItem("taallamt-pending-copy-profile");
    if (savedCopy) {
      try { setCopyProfile(JSON.parse(savedCopy)); } catch {}
    }
  }, []);

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("taallamt-teacher-profile", JSON.stringify(profile));
    setNotice("تم حفظ بيانات المعلم والمدرسة.");
  }

  function saveCopyProfile(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem("taallamt-pending-copy-profile", JSON.stringify(copyProfile));
    setNotice("تم حفظ بيانات النسخة المطلوبة دون نسخ بيانات الفصل الحالي.");
    setCopyOpen(false);
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

      <section className="section card copy-version-card">
        <h3>نسخة زميل أو فصل آخر</h3>
        <p>أدخل بيانات النسخة الجديدة فقط. لن تُنسخ بيانات طلاب هذا الفصل ولن تُنشأ بيانات افتراضية.</p>
        {!copyOpen ? (
          <button className="btn secondary" type="button" onClick={() => setCopyOpen(true)}>إدخال بيانات النسخة</button>
        ) : (
          <form className="stack copy-version-form" onSubmit={saveCopyProfile}>
            <input className="field" required value={copyProfile.teacher} onChange={(e) => setCopyProfile({ ...copyProfile, teacher: e.target.value })} placeholder="اسم المعلم" />
            <input className="field" required value={copyProfile.school} onChange={(e) => setCopyProfile({ ...copyProfile, school: e.target.value })} placeholder="اسم المدرسة" />
            <input className="field" required value={copyProfile.className} onChange={(e) => setCopyProfile({ ...copyProfile, className: e.target.value })} placeholder="الصف والفصل" />
            <div className="mini-actions"><button className="btn" type="submit">حفظ بيانات النسخة</button><button className="btn secondary" type="button" onClick={() => setCopyOpen(false)}>إلغاء</button></div>
          </form>
        )}
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
