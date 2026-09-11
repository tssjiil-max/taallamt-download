"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LiveSchoolTime } from "@/components/LiveSchoolTime";
import { UiIcon, type UiIconName } from "@/components/UiIcon";

type PageMeta = { title: string; subtitle: string };
type NavItem = { href: string; label: string; icon: UiIconName };

const items: NavItem[] = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/teacher/assessment", label: "التقييم", icon: "check" },
  { href: "/teacher/students", label: "الطلاب", icon: "users" },
  { href: "/teacher/more", label: "المزيد", icon: "more" },
];

const pages: Record<string, PageMeta> = {
  "/teacher/assessment": { title: "التقييم الشامل", subtitle: "ملف تقييم واحد لكل طالب" },
  "/teacher/students": { title: "طلاب الفصل", subtitle: "الطلاب والمتابعة" },
  "/teacher/more": { title: "المزيد", subtitle: "المكتبة والتواصل والتقارير والإعدادات" },
  "/teacher/library": { title: "المكتبة", subtitle: "المصادر والملفات التعليمية" },
  "/teacher/announcements": { title: "الرسائل والتواصل", subtitle: "التواصل مع أولياء الأمور" },
  "/teacher/reports": { title: "التقارير", subtitle: "ملخصات التقدم والنتائج" },
  "/teacher/settings": { title: "الإعدادات", subtitle: "الفصل وبيانات النظام" },
  "/teacher/values": { title: "السلوك والتحفيز", subtitle: "السلوك والقيم والنجوم" },
  "/teacher/portfolio": { title: "ملف الإنجاز", subtitle: "الشواهد والأعمال" },
  "/teacher/resources": { title: "الموارد", subtitle: "الأوراق والمواد المساندة" },
  "/teacher/schedule": { title: "الجدول الدراسي", subtitle: "الحصص والأسبوع الدراسي" },
  "/teacher/shakabumbo": { title: "شكابمبو", subtitle: "المساعد داخل تعلّمت" },
  "/teacher/spelling-handwriting": { title: "الإملاء والخط", subtitle: "التدريب والمتابعة الأسبوعية" },
  "/teacher/distribution": { title: "التوزيع الأسبوعي", subtitle: "الدروس والمهارات حسب الأسبوع" },
  "/teacher/data-exchange": { title: "البيانات", subtitle: "الاستيراد والتصدير" },
  "/teacher/backend": { title: "حالة النظام", subtitle: "الربط والخدمات الخلفية" },
};

function resolvePage(pathname: string): PageMeta {
  if (pathname.startsWith("/teacher/students/") && pathname.endsWith("/assessment")) {
    return { title: "التقييم الشامل", subtitle: "المواد والسلوك والقيم والمتابعة" };
  }
  if (pathname.startsWith("/teacher/students/") && pathname.endsWith("/portfolio")) {
    return { title: "ملف إنجاز الطالب", subtitle: "الشواهد والتقدم" };
  }
  if (pathname.startsWith("/teacher/students/")) {
    return { title: "ملف الطالب", subtitle: "المتابعة والتواصل" };
  }
  if (pathname.startsWith("/teacher/subject/")) {
    return { title: "المادة والخطة", subtitle: "الأسبوع والدرس والمهارات" };
  }
  return pages[pathname] ?? { title: "تعلّمت", subtitle: "صفحة المعلم" };
}

export function TeacherBrandHeader() {
  return (
    <header className="tc-home-header">
      <div className="tc-brand-block">
        <div className="tc-brand-name"><span aria-hidden="true">✦</span><strong>تعلّمت</strong></div>
        <div className="tc-teacher-line"><b>أ. سلطان الصاعدي</b><span>الصف الثاني / 4 · مدرسة عمرو بن أوس الثقفي</span></div>
      </div>
      <div className="tc-time"><LiveSchoolTime /></div>
    </header>
  );
}

export function TeacherNav() {
  const pathname = usePathname();
  const comprehensiveAssessment = pathname.startsWith("/teacher/students/") && pathname.endsWith("/assessment");
  return (
    <nav className="tc-bottom-nav" aria-label="التنقل الرئيسي">
      {items.map((item) => {
        let active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        if (item.href === "/teacher/assessment" && comprehensiveAssessment) active = true;
        if (item.href === "/teacher/students" && comprehensiveAssessment) active = false;
        if (item.href === "/teacher/more" && ["/teacher/library", "/teacher/announcements", "/teacher/reports", "/teacher/settings", "/teacher/portfolio", "/teacher/resources", "/teacher/distribution", "/teacher/schedule"].some((prefix) => pathname.startsWith(prefix))) active = true;
        return (
          <Link className={active ? "active" : ""} href={item.href} key={item.href}>
            <span aria-hidden="true"><UiIcon name={item.icon} /></span>
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
  const isComprehensiveAssessment = pathname.startsWith("/teacher/students/") && pathname.endsWith("/assessment");

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => setAlertMessage(String(message ?? "تم تنفيذ الإجراء."));
    return () => { window.alert = originalAlert; };
  }, []);

  return (
    <div className="tc-app">
      <div className="tc-shell">
        <header className="tc-internal-header">
          <Link href="/" className="tc-mini-brand">تعلّمت</Link>
          {!isComprehensiveAssessment && <div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>}
          <span className="tc-class-badge">ثاني / 4</span>
        </header>
        {alertMessage && <div className="tc-alert no-print" role="status"><span>{alertMessage}</span><button type="button" onClick={() => setAlertMessage("")} aria-label="إغلاق التنبيه">×</button></div>}
        <div className="tc-content">{children}</div>
        <TeacherNav />
      </div>
    </div>
  );
}

export function TeacherBackHeader({ title, subtitle }: { title: string; subtitle?: string; icon?: UiIconName }) {
  return (
    <header className="tc-inline-title">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    </header>
  );
}
