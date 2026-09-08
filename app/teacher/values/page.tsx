"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

export default function ValuesPage() {
  const store = useTaallamt();
  const week = academicWeek();
  const currentValues = useMemo(() => store.values.filter((item) => item.active && item.termId === store.activeTermId && week >= item.weekFrom && week <= item.weekTo), [store.values, store.activeTermId, week]);
  const activeValues = useMemo(() => store.values.filter((item) => item.active), [store.values]);
  const [selectedId, setSelectedId] = useState(currentValues[0]?.id ?? store.values[0]?.id ?? "");
  const selected = store.values.find((item) => item.id === selectedId) ?? currentValues[0] ?? store.values[0];
  const [showAdd, setShowAdd] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [title, setTitle] = useState("");
  const [studentText, setStudentText] = useState("");
  const [homeSuggestion, setHomeSuggestion] = useState("");
  const [from, setFrom] = useState(week);
  const [to, setTo] = useState(week);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    store.addValueTarget({ unitName, title, studentText, homeSuggestion, weekFrom: from, weekTo: to });
    setUnitName(""); setTitle(""); setStudentText(""); setHomeSuggestion(""); setShowAdd(false);
  }

  async function addStar(studentId: string) {
    if (!selected) return;
    const key = `add:${studentId}`;
    setBusyKey(key);
    setNotice("");
    try {
      const response = await fetch("/api/teacher/value-stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, valueId: selected.id }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      store.awardValueStar(studentId, selected.id);
      setNotice("تمت إضافة النجمة في Firestore وستظهر في صفحة الطالب خلال ثوانٍ.");
    } catch {
      setNotice("تعذر حفظ النجمة في Firestore. أعد المحاولة.");
    } finally {
      setBusyKey("");
    }
  }

  async function removeStar(studentId: string) {
    if (!selected) return;
    const key = `remove:${studentId}`;
    setBusyKey(key);
    setNotice("");
    try {
      const params = new URLSearchParams({ studentId, valueId: selected.id });
      const response = await fetch(`/api/teacher/value-stars?${params.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      store.removeValueStar(studentId, selected.id);
      setNotice("تمت إزالة آخر نجمة من Firestore.");
    } catch {
      setNotice("تعذر إزالة النجمة الآن.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🌟</div><div><h1>مسابقة نجوم القيم</h1><p>كل قيمة جميلة تستحق نجمة</p></div></div><Link className="btn secondary" href="/">لوحة المعلم</Link></header>
      <DateBar />
      <section className="hero section"><div><h2>قيمة الأسبوع</h2><p>اختر القيمة مباشرة من البطاقات الظاهرة ثم امنح النجمة عند ظهور السلوك فعليًا. النجمة تُحفظ مباشرة في Firestore.</p></div><div className="hero-stats"><div className="stat"><b>3 ⭐</b><span>بطل القيمة</span></div><div className="stat"><b>5 ⭐</b><span>نجم الأسبوع</span></div><div className="stat"><b>8 ⭐</b><span>جائزة مميزة</span></div><div className="stat"><b>{week}</b><span>الأسبوع الحالي</span></div></div></section>

      {notice && <div className="notice section">{notice}</div>}

      <section className="section no-print">
        <div className="card stack">
          <div className="section-head"><h2>اختر القيمة</h2><button className="btn secondary" type="button" onClick={() => setShowAdd((value) => !value)}>إضافة قيمة</button></div>
          <div className="list">
            {activeValues.map((item) => (
              <button key={item.id} type="button" className={`row ${selected?.id === item.id ? "selected" : ""}`} onClick={() => setSelectedId(item.id)}>
                <div className="grow"><h4>{item.title}</h4><small>{item.unitName} · من الأسبوع {item.weekFrom} إلى {item.weekTo}</small></div>
                <span className="badge">{selected?.id === item.id ? "محددة" : "اختيار"}</span>
              </button>
            ))}
          </div>
          {selected && <div className="notice"><b>{selected.title}</b><br />{selected.studentText}<br /><small>للمنزل: {selected.homeSuggestion}</small></div>}
        </div>
      </section>

      {showAdd && <section className="section no-print"><form className="card stack" onSubmit={submit}><h3>قيمة جديدة</h3><input className="field" required value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="اسم الوحدة" /><input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم القيمة" /><input className="field" required value={studentText} onChange={(e) => setStudentText(e.target.value)} placeholder="صياغة مبسطة للطالب" /><input className="field" required value={homeSuggestion} onChange={(e) => setHomeSuggestion(e.target.value)} placeholder="اقتراح بسيط لولي الأمر" /><div className="toolbar"><label>من أسبوع</label><input className="field" type="number" min={1} max={17} value={from} onChange={(e) => setFrom(Number(e.target.value))} /><label>إلى</label><input className="field" type="number" min={1} max={17} value={to} onChange={(e) => setTo(Number(e.target.value))} /><button className="btn" type="submit">حفظ القيمة</button></div></form></section>}

      <section className="section"><div className="section-head"><h2>طلاب الفصل</h2><span className="pill">اضغط + عند تحقق السلوك</span></div><div className="list">{store.students.filter((student) => student.active).map((student) => {
        const count = selected ? store.valueStars.filter((star) => star.studentId === student.id && star.valueId === selected.id).length : 0;
        const badge = count >= 8 ? "🏆 جائزة" : count >= 5 ? "🌟 نجم الأسبوع" : count >= 3 ? "⭐ بطل القيمة" : `${count} نجمة`;
        const adding = busyKey === `add:${student.id}`;
        const removing = busyKey === `remove:${student.id}`;
        return <div className="row" key={student.id}><div className="row-main"><div className="avatar">{student.name.slice(0, 1)}</div><div><h4>{student.name}</h4><small>{"⭐".repeat(Math.min(count, 8)) || "لا توجد نجوم بعد"}</small></div></div><div className="mini-actions"><span className="badge">{badge}</span><button className="btn green" type="button" disabled={!selected || adding || removing} onClick={() => void addStar(student.id)}>{adding ? "…" : "+ ⭐"}</button><button className="btn secondary" type="button" disabled={!selected || count === 0 || adding || removing} onClick={() => void removeStar(student.id)}>{removing ? "…" : "−"}</button></div></div>;
      })}</div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}