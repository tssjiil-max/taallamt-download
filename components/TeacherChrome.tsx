"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LiveSchoolTime } from "@/components/LiveSchoolTime";
import { UiIcon, type UiIconName } from "@/components/UiIcon";

type PageMeta = { title: string; subtitle: string; icon: UiIconName };
type NavItem = { href: string; label: string; icon: UiIconName };

const items: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/teacher/assessment", label: "التقييم", icon: "check" },
  { href: "/teacher/students", label: "الطلاب", icon: "users" },
  { href: "/teacher/values", label: "السلوك", icon: "star" },
];

const pages: Record<string, PageMeta> = {
  "/teacher/assessment": { title: "التقييم الشامل", subtitle: "ملف واحد لكل طالب", icon: "check" },
  "/teacher/students": { title: "طلاب الفصل", subtitle: "اضغط اسم الطالب لفتح تقييمه الشامل", icon: "users" },
  "/teacher/library": { title: "المكتبة", subtitle: "المصادر والملفات التعليمية", icon: "library" },
  "/teacher/announcements": { title: "الرسائل والتواصل", subtitle: "الرسائل والإعلانات وطلبات أولياء الأمور", icon: "message" },
  "/teacher/reports": { title: "التقارير", subtitle: "ملخصات التقدم والنتائج", icon: "report" },
  "/teacher/settings": { title: "الإعدادات والمزيد", subtitle: "الفصل والجدول وأدوات النظام", icon: "settings" },
  "/teacher/values": { title: "السلوك والتحفيز", subtitle: "السلوك والقيم والنجوم والمكافآت", icon: "star" },
  "/teacher/portfolio": { title: "ملف إنجازي", subtitle: "أعمال المعلم وإنجازاته", icon: "report" },
  "/teacher/resources": { title: "الموارد", subtitle: "المحتوى والمواد المساندة", icon: "book" },
  "/teacher/schedule": { title: "الجدول الدراسي", subtitle: "الحصص والأسبوع الدراسي", icon: "calendar" },
  "/teacher/shakabumbo": { title: "شكابمبو", subtitle: "مساعدك الذكي داخل تعلّمت", icon: "sparkle" },
  "/teacher/spelling-handwriting": { title: "الإملاء والخط", subtitle: "التدريب والمتابعة الأسبوعية", icon: "pen" },
  "/teacher/distribution": { title: "توزيع المنهج", subtitle: "الخطة الأسبوعية للمواد", icon: "layers" },
  "/teacher/data-exchange": { title: "البيانات", subtitle: "الاستيراد والتصدير والنسخ الاحتياطي", icon: "database" },
  "/teacher/backend": { title: "حالة النظام", subtitle: "الربط والخدمات الخلفية", icon: "database" },
  "/teacher/auth-secret": { title: "دخول المعلم", subtitle: "إعداد الدخول الآمن", icon: "shield" },
  "/teacher/firebase-secret": { title: "إعداد الربط", subtitle: "إعدادات الخدمة", icon: "shield" },
};

function resolvePage(pathname: string): PageMeta {
  if (pathname.startsWith("/teacher/students/") && pathname.endsWith("/assessment")) return { title: "التقييم الشامل", subtitle: "المواد والسلوك والقيم والمتابعة في صفحة واحدة", icon: "check" };
  if (pathname.startsWith("/teacher/students/") && pathname.endsWith("/portfolio")) return { title: "ملف إنجاز الطالب", subtitle: "الشواهد والتقدم والمهارات", icon: "star" };
  if (pathname.startsWith("/teacher/students/")) return { title: "ملف الطالب", subtitle: "التقييم والمتابعة والتواصل", icon: "student" };
  if (pathname.startsWith("/teacher/subject/")) return { title: "المادة والمهارات", subtitle: "خطة الأسبوع والتقييم", icon: "book" };
  return pages[pathname] ?? { title: "تعلّمت", subtitle: "صفحة المعلم", icon: "sparkle" };
}

export function TeacherBrandHeader() {
  return (
    <header className="teacher-app-header">
      <div className="teacher-header-top">
        <Link className="teacher-wordmark" href="/" aria-label="تعلّمت - الرئيسية">
          <span className="teacher-wordmark-mark"><UiIcon name="sparkle" /></span>
          <div><h1>تعلّمت</h1><p>القمة تكفي الجميع</p></div>
        </Link>

        <Link className="teacher-mascot-card" href="/teacher/shakabumbo" aria-label="فتح مساعد شكابمبو">
          <Image src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" width={116} height={116} priority />
          <span>المعرفة قوة</span>
        </Link>

        <div className="teacher-header-time"><LiveSchoolTime /></div>
      </div>

      <div className="teacher-identity-card">
        <span className="teacher-identity-avatar" aria-hidden="true"><UiIcon name="student" /></span>
        <div className="teacher-identity-copy">
          <small>المعلم</small>
          <strong>أ. سلطان الصاعدي</strong>
          <span>الصف الثاني / 4 · مدرسة عمرو بن أوس الثقفي</span>
        </div>
        <Link className="teacher-identity-settings" href="/teacher/settings" aria-label="إعدادات المعلم"><UiIcon name="settings" /></Link>
      </div>
    </header>
  );
}

export function TeacherNav() {
  const pathname = usePathname();
  const comprehensiveAssessment = pathname.startsWith("/teacher/students/") && pathname.endsWith("/assessment");
  return (
    <nav className="ta-nav teacher-main-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        let active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        if (item.href === "/teacher/assessment" && comprehensiveAssessment) active = true;
        if (item.href === "/teacher/students" && comprehensiveAssessment) active = false;
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

export function TeacherFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = resolvePage(pathname);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => setAlertMessage(String(message ?? "تم تنفيذ الإجراء."));
    return () => { window.alert = originalAlert; };
  }, []);

  return (
    <div className="teacher-unified">
      <div className="teacher-unified-shell">
        <TeacherBrandHeader />

        <section className="teacher-page-heading">
          <span className="teacher-page-heading-icon" aria-hidden="true"><UiIcon name={meta.icon} /></span>
          <div className="teacher-page-heading-copy">
            <small>صفحة المعلم</small>
            <h2>{meta.title}</h2>
            <p>{meta.subtitle}</p>
          </div>
          <Link href="/" className="teacher-page-heading-home"><UiIcon name="home" /><span>الرئيسية</span></Link>
        </section>

        {alertMessage && <div className="teacher-inline-alert no-print" role="status"><span>{alertMessage}</span><button type="button" onClick={() => setAlertMessage("")} aria-label="إغلاق التنبيه">×</button></div>}
        <div className="teacher-unified-content">{children}</div>
        <TeacherNav />
      </div>
    </div>
  );
}

export function TeacherBackHeader({ title, subtitle, icon = "student" }: { title: string; subtitle?: string; icon?: UiIconName }) {
  return (
    <header className="ta-inner-header">
      <Link href="/" className="ta-logo" aria-label="العودة إلى الرئيسية"><UiIcon name={icon} /></Link>
      <div><small>تعلّمت · الصف الثاني / 4</small><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      <Link href="/" className="ta-back"><UiIcon name="home" /><span>الرئيسية</span></Link>
    </header>
  );
}
