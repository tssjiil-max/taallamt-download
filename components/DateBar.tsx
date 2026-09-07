"use client";

import { useEffect, useState } from "react";

const TZ = "Asia/Riyadh";

export function DateBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

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
      <span className="date-time">🕒 {time}</span>
    </div>
  );
}
