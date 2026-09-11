"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LiveSchoolTime } from "@/components/LiveSchoolTime";

type PageMeta = { title: string; subtitle: string; icon: string };

const items = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/teacher/assessment", label: "التقييم", icon: "✓" },
  { href: "/teacher/students", label: "الطلاب", icon: "◉" },
  { href: "/teacher/values", label: "السلوك", icon: "★" },
];

const pages: Record<string, PageMeta> = {
  "/teacher/assessment": { title: "التقييم السريع", subtitle: "تقييم واضح وسريع أثناء الحصة", icon: "✓" },
  "/teacher/students": { title: "طلاب الفصل", subtitle: "الملفات والتقييم والمتابعة", icon: "◉" },
  "/teacher/library": { title: "المكتبة", subtitle: "المصادر والملفات التعليمية", icon: "▤" },
  "/teacher/announcements": { title: "التواصل", subtitle: "الإعلانات وطلبات أولياء الأمور", icon: "◌" },
  "/teacher/reports": { title: "التقارير", subtitle: "ملخصات التقدم والنتائج", icon: "▥" },
  "/teacher/settings": { title: "الإعدادات والمزيد", subtitle: "الفصل والجدول وأدوات النظام", icon: "•••" },
  "/teacher/values": { title: "السلوك والتحفيز", subtitle: "تعزيز القيم والسلوك الإيجابي", icon: "★" },
  "/teacher/portfolio": { title: "ملف إنجازي", subtitle: "أعمال المعلم وإنجازاته", icon: "◇" },
  "/teacher/resources": { title: "الموارد", subtitle: "المحتوى والمواد المساندة", icon: "▦" },
  "/teacher/schedule": { title: "الجدول الدراسي", subtitle: "الحصص والأسبوع الدراسي", icon: "≡" },
  "/teacher/shakabumbo": { title: "شكابمبو", subtitle: "مساعدك الذكي داخل تعلّمت", icon: "✦" },
  "/teacher/spelling-handwriting": { title: "الإملاء والخط", subtitle: "التدريب والمتابعة الأسبوعية", icon: "✎" },
  "/teacher/distribution": { title: "توزيع المنهج", subtitle: "الخطة الأسبوعية للمواد", icon: "▧" },
  "/teacher/data-exchange": { title: "البيانات", subtitle: "الاستيراد والتصدير والنسخ الاحتياطي", icon: "⇄" },
  "/teacher/backend": { title: "حالة النظام", subtitle: "الربط والخدمات الخلفية", icon: "◎" },
  "/teacher/auth-secret": { title: "دخول المعلم", subtitle: "إعداد الدخول الآمن", icon: "◈" },
  "/teacher/firebase-secret": { title: "إعداد الربط", subtitle: "إعدادات الخدمة", icon: "◈" },
};

function resolvePage(pathname: string): PageMeta {
  if (pathname.startsWith("/teacher/students/")) return { title: "ملف الطالب", subtitle: "التقييم والمتابعة والتواصل", icon: "◉" };
  if (pathname.startsWith("/teacher/subject/")) return { title: "المادة والمهارات", subtitle: "خطة الأسبوع والتقييم", icon: "▤" };
  return pages[pathname] ?? { title: "تعلّمت", subtitle: "صفحة المعلم", icon: "✦" };
}

export function TeacherBrandHeader() {
  return (
    <>
      <section className="ta-hero teacher-shared-hero">
        <div className="ta-brand">
          <div className="ta-wordmark"><span>★</span><h1>تعلّمت</h1><p>القمة تكفي الجميع</p></div>
          <div className="ta-profile"><strong>أ. سلطان الصاعدي</strong><span>الصف الثاني / 4</span><small>مدرسة عمرو بن أوس الثقفي</small></div>
        </div>
        <Link className="ta-mascot" href="/teacher/shakabumbo" aria-label="فتح مساعد شكابمبو">
          <Image src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" width={180} height={180} priority />
          <div><b>المعرفة قوة</b><span>شكابمبو · مساعدك الذكي</span></div>
        </Link>
      </section>
      <LiveSchoolTime />
    </>
  );
}

export function TeacherNav() {
  const pathname = usePathname();
  return <nav className="ta-nav" aria-label="التنقل الرئيسي">{items.map((item) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return <Link className={active ? "active" : ""} href={item.href} key={item.href}><span aria-hidden="true">{item.icon}</span><b>{item.label}</b></Link>;
  })}</nav>;
}

export function TeacherFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const meta = resolvePage(pathname);
  return (
    <div className="teacher-unified">
      <div className="teacher-unified-shell">
        <TeacherBrandHeader />
        <section className="teacher-page-banner">
          <span className="teacher-page-icon" aria-hidden="true">{meta.icon}</span>
          <div><small>تعلّمت · الصف الثاني / 4</small><h2>{meta.title}</h2><p>{meta.subtitle}</p></div>
          <Link href="/" className="teacher-page-home">الرئيسية</Link>
        </section>
        <div className="teacher-unified-content">{children}</div>
        <TeacherNav />
      </div>
    </div>
  );
}

export function TeacherBackHeader({ title, subtitle, icon = "ت" }: { title: string; subtitle?: string; icon?: string }) {
  return <header className="ta-inner-header"><Link href="/" className="ta-logo" aria-label="العودة إلى اليوم">{icon}</Link><div><small>تعلّمت · الصف الثاني / 4</small><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><Link href="/" className="ta-back">الرئيسية</Link></header>;
}
