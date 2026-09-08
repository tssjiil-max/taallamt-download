"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { DateBar } from "@/components/DateBar";

type Announcement = {
  id: string;
  title: string;
  body: string;
  eventDate?: string | null;
  kind?: "general" | "event" | "reminder";
  active?: boolean;
  createdAt?: string;
};

export default function TeacherAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [kind, setKind] = useState<"general" | "event" | "reminder">("general");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/teacher/announcements", { cache: "no-store" });
    if (!response.ok) throw new Error("LOAD_FAILED");
    const data = await response.json();
    setItems(Array.isArray(data.announcements) ? data.announcements : []);
  }

  useEffect(() => { void load().catch(() => setNotice("تعذر تحميل الإعلانات الآن.")); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, eventDate, kind }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      setTitle(""); setBody(""); setEventDate(""); setKind("general");
      await load();
      setNotice("تم نشر الإعلان لجميع أولياء الأمور المفعّل لهم الدخول.");
    } catch { setNotice("تعذر نشر الإعلان الآن."); }
    finally { setBusy(false); }
  }

  async function hide(id: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/teacher/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      await load(); setNotice("تم إخفاء الإعلان عن أولياء الأمور.");
    } catch { setNotice("تعذر إخفاء الإعلان الآن."); }
    finally { setBusy(false); }
  }

  const activeItems = items.filter((item) => item.active !== false);

  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">📢</div><div><h1>الإعلانات</h1><p>أحداث وتنبيهات عامة تصل لجميع أولياء الأمور</p></div></div><Link className="btn secondary" href="/">الرئيسية</Link></header>
    <DateBar />
    <section className="section"><form className="card stack" onSubmit={submit}>
      <h2>إعلان جديد</h2>
      <div className="toolbar"><label>النوع</label><select className="field" value={kind} onChange={(e)=>setKind(e.target.value as typeof kind)}><option value="general">إعلان عام</option><option value="event">حدث</option><option value="reminder">تذكير</option></select><label>تاريخ الحدث</label><input className="field" type="date" value={eventDate} onChange={(e)=>setEventDate(e.target.value)} /></div>
      <input className="field" required value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="عنوان الإعلان — مثال: لقاء أولياء الأمور" />
      <textarea className="field textarea" required value={body} onChange={(e)=>setBody(e.target.value)} placeholder="اكتب التفاصيل المختصرة التي تريد أن يراها ولي الأمر" />
      <button className="btn" type="submit" disabled={busy}>{busy ? "جاري النشر…" : "نشر لولي الأمر"}</button>
      <small>هذا القسم للأحداث العامة فقط. الرسائل الفردية تبقى داخل صفحة الطالب وولي الأمر.</small>
    </form></section>
    {notice && <div className="notice section">{notice}</div>}
    <section className="section"><div className="section-head"><h2>الإعلانات المنشورة</h2><span className="pill">{activeItems.length}</span></div><div className="list">{activeItems.map((item)=><div className="row" key={item.id}><div><h4>📢 {item.title}</h4><small>{item.eventDate ? `التاريخ: ${item.eventDate} · ` : ""}{item.body}</small></div><button className="btn secondary" disabled={busy} type="button" onClick={()=>void hide(item.id)}>إخفاء</button></div>)}{activeItems.length===0 && <div className="notice">لا توجد إعلانات عامة منشورة حاليًا.</div>}</div></section>
  </main>;
}
