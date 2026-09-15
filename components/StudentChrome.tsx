"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { UiIcon } from "@/components/UiIcon";

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
        window.location.replace("/student");
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
        <Link className="student-wordmark" href="/student" aria-label="تعلّمت - صفحة الطالب">
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

export function StudentFrame({ children }: { children: ReactNode }) {
  return (
    <div className="student-unified">
      <div className="student-unified-shell">
        <StudentBrandHeader />
        <DirectStudentLink />
        <div className="student-unified-content">{children}</div>
      </div>
    </div>
  );
}
