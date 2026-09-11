"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GuardianHomeBehaviorPanel } from "@/components/GuardianHomeBehaviorPanel";
import { UiIcon, type UiIconName } from "@/components/UiIcon";

type StudentNavItem = { href: string; label: string; icon: UiIconName };

const navItems: StudentNavItem[] = [
  { href: "/guardian", label: "الرئيسية", icon: "home" },
  { href: "/guardian#follow", label: "متابعة", icon: "check" },
  { href: "/guardian#library", label: "المكتبة", icon: "library" },
  { href: "/guardian/profile", label: "المزيد", icon: "more" },
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
    <header className="student-app-header">
      <div className="student-header-top">
        <Link className="student-wordmark" href="/guardian" aria-label="تعلّمت - الرئيسية">
          <span className="student-wordmark-mark"><UiIcon name="sparkle" /></span>
          <div><h1>تعلّمت</h1><p>القمة تكفي الجميع</p></div>
        </Link>

        <div className="student-header-mascot">
          <img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" />
          <span>المعرفة قوة</span>
        </div>

        <div className="student-header-date">
          <span>اليوم</span>
          <b>{date || "—"}</b>
          <strong>{time || "--:--"}</strong>
        </div>
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
        return (
          <Link className={active ? "active" : ""} href={item.href} key={item.href}>
            <span className="nav-icon" aria-hidden="true"><UiIcon name={item.icon} /></span>
            <b>{item.label}</b>
          </Link>
        );
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
