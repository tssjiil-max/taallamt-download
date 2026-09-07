"use client";

import { useEffect, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";
import { academicWeek, plansForWeek, tomorrowAnnouncement } from "@/lib/schedule";

type Role = "teacher" | "guardian";

type Notice = {
  title: string;
  body: string;
  level?: "normal" | "warn";
  url?: string;
};

const TZ = "Asia/Riyadh";

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayName(date = new Date()) {
  return new Intl.DateTimeFormat("ar-SA", { timeZone: TZ, weekday: "long" }).format(date);
}

export function NotificationPanel({ role, studentId }: { role: Role; studentId?: string }) {
  const store = useTaallamt();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const today = dayName();
  const week = academicWeek();
  const tomorrow = tomorrowAnnouncement(store.weeklyPlans, store.subjects);
  const weekly = plansForWeek(store.weeklyPlans, week);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const notices = useMemo<Notice[]>(() => {
    if (role === "teacher") {
      const guardianMessages = store.messages.filter((m) => m.author === "guardian").length;
      const needsReview = Object.values(store.followUps).filter((f) => f.status === "needs_review").length;
      const publishedResources = store.resources.filter((resource) => resource.publishedToGuardian).length;
      const tomorrowText = tomorrow.items.length ? tomorrow.items.join(" • ") : "لا يوجد تفصيل يومي محفوظ للغد بعد.";
      return [
        { title: `غدًا ${tomorrow.tomorrow}`, body: tomorrowText, url: "/teacher/schedule" },
        { title: "رسائل أولياء الأمور", body: guardianMessages ? `لديك ${guardianMessages} رسالة من أولياء الأمور.` : "لا توجد رسائل جديدة من أولياء الأمور." },
        { title: "الأوراق والاختبارات", body: publishedResources ? `لديك ${publishedResources} ورقة أو اختبار منشور لولي الأمر.` : "لا توجد أوراق أو اختبارات منشورة بعد.", url: "/teacher/resources" },
        { title: "المتابعة الخاصة", body: needsReview ? `${needsReview} ملفات تحتاج مراجعة.` : "لا توجد ملفات متابعة خاصة معلقة.", level: needsReview ? "warn" : "normal" },
      ];
    }

    const teacherMessages = store.messages.filter((m) => m.author === "teacher" && (!studentId || m.studentId === studentId)).length;
    const followUp = studentId ? store.followUps[studentId] : undefined;
    const studentResources = studentId ? store.resources.filter((resource) => resource.publishedToGuardian && resource.audienceStudentIds.includes(studentId)) : [];
    const tomorrowText = tomorrow.items.length ? tomorrow.items.join(" • ") : "لا يوجد تفصيل يومي محفوظ للغد بعد.";
    const result: Notice[] = [];
    if (today === "السبت") {
      result.push({ title: `خطة الأسبوع ${week}`, body: `تم نشر خطة الأسبوع، وتشمل ${weekly.length} مواد أو بنود رئيسية.`, url: "/guardian" });
    }
    result.push({ title: `ماذا لدينا غدًا؟ — ${tomorrow.tomorrow}`, body: tomorrowText, url: "/guardian" });
    if (studentResources.length) {
      const latest = studentResources[0];
      result.push({ title: "ورقة أو اختبار من المعلم", body: latest.title, url: `/guardian/resources/${latest.id}` });
    }
    if (teacherMessages) result.push({ title: "رسالة من المعلم", body: `لديك ${teacherMessages} رسالة محفوظة من المعلم.`, url: "/guardian" });
    if (followUp?.status === "needs_review") result.push({ title: "متابعة الطالب", body: "يوجد ملف متابعة يحتاج مراجعة أو تحديثًا مع المدرسة.", level: "warn", url: "/guardian" });
    return result;
  }, [role, studentId, store.messages, store.followUps, store.weeklyPlans, store.subjects, store.resources, today, week, weekly.length, tomorrow]);

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") await sendSystemNotification(notices[0]);
  }

  async function sendSystemNotification(notice?: Notice) {
    if (!notice || Notification.permission !== "granted") return;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notice.title, {
      body: notice.body,
      icon: "/shakabumbo.jpg",
      badge: "/shakabumbo.jpg",
      tag: `taallamt-${role}-${dateKey()}`,
      data: { url: notice.url ?? (role === "teacher" ? "/" : "/guardian") },
    });
  }

  useEffect(() => {
    if (permission !== "granted" || notices.length === 0) return;
    const key = `taallamt-notified-${role}-${studentId ?? "all"}-${dateKey()}`;
    if (localStorage.getItem(key)) return;
    sendSystemNotification(notices[0]).then(() => localStorage.setItem(key, "1")).catch(() => undefined);
  }, [permission, notices, role, studentId]);

  return (
    <section className="section no-print">
      <div className="section-head">
        <h2>🔔 الإشعارات</h2>
        {permission === "granted" ? (
          <span className="badge">مفعلة على هذا الجهاز</span>
        ) : permission === "unsupported" ? (
          <span className="badge warn">الجهاز لا يدعم إشعارات الويب</span>
        ) : (
          <button className="btn" type="button" onClick={enableNotifications}>تفعيل إشعارات الجهاز</button>
        )}
      </div>
      <div className="notification-list">
        {notices.map((notice, index) => (
          <div className={`notification-item ${notice.level === "warn" ? "warn" : ""}`} key={`${notice.title}-${index}`}>
            <div className="notification-dot" />
            <div><h4>{notice.title}</h4><p>{notice.body}</p></div>
          </div>
        ))}
      </div>
      <small className="notification-note">الإشعارات الظاهرة هنا تعمل داخل النظام الآن. وإذن إشعارات الجهاز يفعّل تنبيهات النظام. أما الإرسال والجوال مغلق أو الموقع غير مفتوح فيحتاج ربط خدمة Push خلفية عند النشر النهائي.</small>
    </section>
  );
}
