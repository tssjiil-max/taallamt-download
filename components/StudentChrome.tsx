"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GuardianHomeBehaviorPanel } from "@/components/GuardianHomeBehaviorPanel";

const navItems = [
  { href: "/guardian", label: "الرئيسية", icon: "⌂" },
  { href: "/guardian#follow", label: "متابعة", icon: "◉" },
  { href: "/guardian#library", label: "المكتبة", icon: "▤" },
  { href: "/guardian/profile", label: "المزيد", icon: "•••" },
];

function DirectStudentLink() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const studentId = query.get("student")?.trim();
    const shareToken = query.get("token")?.trim();
    if (!studentId || !shareToken) return;
    let alive = true;

    async function openStudent() {
      setMessage("جاري فتح صفحة الطالب مباشرة…");
      try {
        const login = await fetch("/api/guardian/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, shareToken }),
        });
        if (!alive) return;
        if (!login.ok) {
          if (login.status === 403) setMessage("رابط صفحة الطالب غير مفعّل.");
          else if (login.status === 409) setMessage("بلغ الرابط الحد المسموح للأجهزة. اطلب من المعلم إعادة تفعيل الوصول.");
          else setMessage("تعذر فتح رابط صفحة الطالب. تأكد أن الرابط كامل وحديث.");
          return;
        }
        window.location.replace("/guardian");
      } catch {
        if (alive) setMessage("تعذر فتح رابط صفحة الطالب الآن.");
      }
    }

    void openStudent();
    return () => { alive = false; };
  }, []);

  return message ? <div className="student-direct-link-status" role="status">{message}</div> : null;
}

export function StudentBrandHeader() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setDate(new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long" }).format(now));
      setTime(new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "2-digit" }).format(now));
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <header className="student-brand-header">
      <div className="student-brand-copy">
        <span>★</span>
        <h1>تعلّمت</h1>
        <p>القمة تكفي الجميع</p>
      </div>
      <div className="student-brand-mascot">
        <img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" />
        <b>المعرفة قوة</b>
      </div>
      <div className="student-date-card">
        <b>{date || "اليوم"}</b>
        <span>{time || "--:--"}</span>
      </div>
    </header>
  );
}

export function StudentBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="student-bottom-nav" aria-label="تنقل صفحة الطالب">
      {navItems.map((item) => {
        const active = item.href === "/guardian" ? pathname === "/guardian" : pathname === item.href;
        return <Link className={active ? "active" : ""} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b></Link>;
      })}
    </nav>
  );
}

export function StudentFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="student-unified">
      <div className="student-unified-shell">
        <StudentBrandHeader />
        <DirectStudentLink />
        <div className="student-unified-content">{children}</div>
        {pathname === "/guardian" && <GuardianHomeBehaviorPanel />}
        <StudentBottomNav />
      </div>
    </div>
  );
}
