"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TZ = "Asia/Riyadh";

export function DateBar() {
  const [now, setNow] = useState<Date | null>(null);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const pathname = usePathname();
  const isGuardian = pathname.startsWith("/guardian");

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isGuardian) return;
    let cancelled = false;
    fetch("/api/guardian/announcements", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled && Array.isArray(data?.announcements)) setAnnouncementCount(data.announcements.length);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [isGuardian, pathname]);

  if (!now) return <div className="date-bar">جاري تحديد اليوم والتاريخ…</div>;

  const gregorian = new Intl.DateTimeFormat("ar-SA", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const time = new Intl.DateTimeFormat("ar-SA", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(now);

  return (
    <div className="date-bar" aria-label="اليوم والتاريخ">
      <div><b>📅 {gregorian}</b><span>هجري: {hijri}</span></div>
      <div className="mini-actions">
        {isGuardian && <Link className="btn secondary" href="/guardian/announcements" aria-label="الإعلانات">📢 الإعلانات{announcementCount > 0 ? ` (${announcementCount})` : ""}</Link>}
        <span className="date-time">🕒 {time}</span>
      </div>
    </div>
  );
}
