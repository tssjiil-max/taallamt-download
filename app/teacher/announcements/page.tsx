"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { TeacherWhatsAppComposer } from "@/components/TeacherWhatsAppComposer";
import { getTeacherContactRequests, getTeacherMessages, setTeacherContactRequest, type ContactRequest } from "@/lib/teacher-api";
import type { Message } from "@/lib/types";

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
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"general" | "event" | "reminder">("general");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    const announcementResponse = await fetch("/api/teacher/announcements", { cache: "no-store" });
    if (!announcementResponse.ok) throw new Error("LOAD_FAILED");
    const [announcementData, contactData, messageData] = await Promise.all([
      announcementResponse.json(),
      getTeacherContactRequests(),
      getTeacherMessages(),
    ]);
    setItems(Array.isArray(announcementData.announcements) ? announcementData.announcements : []);
    setRequests(contactData.requests);
    setMessages(messageData.messages);
  }

  useEffect(() => {
    void load().catch(() => setNotice("تعذر تحميل التواصل الآن. تحقق من جلسة المعلم والربط الخلفي."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, kind }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "SAVE_FAILED");
      }
      setTitle("");
      setBody("");
      setKind("general");
      await load();
      setNotice("تم نشر الإعلان لجميع صفحات الطلاب المفعّل لهم الدخول.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setNotice(
        code === "INVALID_SESSION"
          ? "انتهت جلسة المعلم. افتح الإعدادات وسجّل الدخول ثم أعد النشر."
          : code === "BACKEND_NOT_CONFIGURED"
            ? "النشر غير مفعّل على هذه النسخة؛ يلزم ربط إعدادات Firebase في Vercel."
            : "تعذر نشر الإعلان الآن. تحقق من الاتصال ثم أعد المحاولة.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: string) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/teacher/announcements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      await load();
      setNotice("تم إخفاء الإعلان عن صفحة الطالب.");
    } catch {
      setNotice("تعذر إخفاء الإعلان الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(studentId: string, status: "approved" | "rejected" | "closed") {
    setBusy(true);
    setNotice("");
    try {
      await setTeacherContactRequest(studentId, status);
      await load();
      setNotice(status === "approved" ? "تم فتح المحادثة لهذا الطالب." : status === "rejected" ? "تم رفض طلب التواصل، والمحادثة ما زالت مغلقة." : "تم إغلاق المحادثة.");
    } catch {
      setNotice("تعذر تحديث صلاحية التواصل الآن.");
    } finally {
      setBusy(false);
    }
  }

  const activeItems = items.filter((item) => item.active !== false);
  const pendingRequests = requests.filter((item) => item.status === "pending");
  const approvedRequests = requests.filter((item) => item.status === "approved");
  const guardianMessages = messages.filter((item) => item.author === "guardian").slice(-20).reverse();

  return (
    <main className="shell">
      <TeacherWhatsAppComposer />

      <section className="section">
        <form className="card stack" onSubmit={submit}>
          <div className="section-head"><div><h2>إعلان جديد</h2><p>إعلان عام يظهر في صفحة الطالب، مستقل عن المحادثات الفردية.</p></div><span className="badge">عام</span></div>
          <div className="toolbar">
            <label>النوع</label>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="general">إعلان عام</option>
              <option value="event">حدث</option>
              <option value="reminder">تذكير</option>
            </select>
          </div>
          <input className="field" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان — مثال: لقاء أولياء الأمور" />
          <textarea className="field textarea" required value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب التفاصيل المختصرة" />
          <button className="btn" type="submit" disabled={busy}>{busy ? "جاري النشر…" : "نشر الإعلان"}</button>
          <small>التواصل الفردي مغلق افتراضيًا ولا يفتح إلا بعد اعتمادك لطلب التواصل.</small>
        </form>
      </section>
      {notice && <div className="notice section">{notice}</div>}

      <section className="section">
        <div className="section-head"><div><h2>طلبات فتح التواصل</h2><p>أنت تقرر فتح المحادثة أو إبقاءها مغلقة.</p></div><span className={`pill ${pendingRequests.length ? "warn" : ""}`}>{pendingRequests.length}</span></div>
        <div className="list">
          {pendingRequests.map((request) => (
            <div className="row" key={request.studentId}>
              <div><h4>💬 {request.studentName || "طالب"}</h4><small>{request.reason || "طلب تواصل بدون سبب مكتوب"}</small></div>
              <div className="mini-actions"><button className="btn" disabled={busy} type="button" onClick={() => void decide(request.studentId, "approved")}>موافقة</button><button className="btn secondary" disabled={busy} type="button" onClick={() => void decide(request.studentId, "rejected")}>رفض</button></div>
            </div>
          ))}
          {!pendingRequests.length && <div className="notice">لا توجد طلبات تواصل بانتظار قرارك.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><h2>المحادثات المفتوحة</h2><p>يمكنك إغلاق أي محادثة في أي وقت.</p></div><span className="pill">{approvedRequests.length}</span></div>
        <div className="list">
          {approvedRequests.map((request) => <div className="row" key={request.studentId}><div><h4>{request.studentName || "طالب"}</h4><small>التواصل معتمد</small></div><div className="mini-actions"><Link className="btn secondary" href={`/teacher/students/${request.studentId}`}>فتح ملف الطالب</Link><button className="btn danger" disabled={busy} type="button" onClick={() => void decide(request.studentId, "closed")}>إغلاق التواصل</button></div></div>)}
          {!approvedRequests.length && <div className="notice">لا توجد محادثات مفتوحة حاليًا.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>آخر رسائل أولياء الأمور</h2><span className="pill">{guardianMessages.length}</span></div>
        <div className="list">
          {guardianMessages.map((message) => {
            const request = requests.find((item) => item.studentId === message.studentId);
            return <div className="row" key={message.id}><div><h4>💬 {request?.studentName || "ولي أمر"}</h4><small>{message.body}</small></div><Link className="btn secondary" href={`/teacher/students/${message.studentId}`}>فتح المحادثة</Link></div>;
          })}
          {!guardianMessages.length && <div className="notice">لا توجد رسائل فردية حتى الآن.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>الإعلانات المنشورة</h2><span className="pill">{activeItems.length}</span></div>
        <div className="list">
          {activeItems.map((item) => <div className="row" key={item.id}><div><h4>📢 {item.title}</h4><small>{item.eventDate ? `التاريخ: ${item.eventDate} · ` : ""}{item.body}</small></div><button className="btn secondary" disabled={busy} type="button" onClick={() => void hide(item.id)}>إخفاء</button></div>)}
          {!activeItems.length && <div className="notice">لا توجد إعلانات عامة منشورة حاليًا.</div>}
        </div>
      </section>
    </main>
  );
}
