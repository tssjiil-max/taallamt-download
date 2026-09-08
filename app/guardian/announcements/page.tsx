"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DateBar } from "@/components/DateBar";

type Announcement = {
  id: string;
  title: string;
  body: string;
  eventDate?: string | null;
  kind?: "general" | "event" | "reminder";
  createdAt?: string;
};

const kindLabel = { general: "إعلان عام", event: "حدث", reminder: "تذكير" } as const;

export default function GuardianAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/guardian/announcements", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) throw new Error("LOGIN");
        if (!response.ok) throw new Error("LOAD");
        return response.json();
      })
      .then((data) => setItems(Array.isArray(data.announcements) ? data.announcements : []))
      .catch((err) => setError(err instanceof Error && err.message === "LOGIN" ? "سجّل الدخول من بوابة ولي الأمر أولًا." : "تعذر تحميل الإعلانات الآن."))
      .finally(() => setLoading(false));
  }, []);

  return <main className="shell">
    <header className="topbar"><div className="brand"><div className="logo">📢</div><div><h1>الإعلانات</h1><p>الأحداث والتنبيهات العامة من المعلم</p></div></div><Link className="btn secondary" href="/guardian">متابعة الطالب</Link></header>
    <DateBar />
    <section className="section">
      {loading && <div className="notice">جاري تحميل الإعلانات…</div>}
      {error && <div className="notice warn">{error}</div>}
      {!loading && !error && <div className="list">{items.map((item)=><article className="card" key={item.id}><div className="section-head"><h2>📢 {item.title}</h2><span className="badge">{kindLabel[item.kind ?? "general"]}</span></div>{item.eventDate && <p><b>التاريخ:</b> {item.eventDate}</p>}<p>{item.body}</p></article>)}{items.length===0 && <div className="notice">لا توجد إعلانات عامة حاليًا.</div>}</div>}
    </section>
    <footer className="site-credit">برمجة سلطان الصاعدي</footer>
  </main>;
}
