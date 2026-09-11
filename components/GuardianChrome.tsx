"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { guardianMe } from "@/lib/guardian-api";
import { UiIcon, type UiIconName } from "@/components/UiIcon";

type ChromeBundle = {
  student: { name: string; className: string };
  profile: { preferredName?: string; photoDataUrl?: string } | null;
};

type NavItem = { hash: string; label: string; icon: UiIconName };

const navItems: NavItem[] = [
  { hash: "home", label: "الرئيسية", icon: "home" },
  { hash: "follow", label: "المتابعة", icon: "report" },
  { hash: "homework", label: "الواجبات", icon: "check" },
  { hash: "subjects", label: "المواد", icon: "book" },
  { hash: "more", label: "المزيد", icon: "more" },
];

function pageTitle(pathname: string) {
  if (pathname.includes("/profile")) return "معلومات الطالب";
  if (pathname.includes("/portfolio")) return "ملف الإنجاز";
  if (pathname.includes("/resources")) return "المكتبة";
  if (pathname.includes("/announcements")) return "التنبيهات";
  return "صفحة الطالب";
}

export function GuardianChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [bundle, setBundle] = useState<ChromeBundle | null>(null);
  const [hash, setHash] = useState("home");

  useEffect(() => {
    guardianMe<ChromeBundle>().then(setBundle).catch(() => setBundle(null));
  }, [pathname]);

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace("#", "") || "home");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const isHome = pathname === "/guardian";
  const name = bundle?.profile?.preferredName || bundle?.student.name || "";

  return (
    <div className="guardian-ui" dir="rtl">
      {!isHome && bundle ? (
        <header className="guardian-mini-header">
          <Link href="/guardian#more" className="guardian-mini-back" aria-label="العودة">‹</Link>
          <div className="guardian-mini-photo">
            {bundle.profile?.photoDataUrl ? <img src={bundle.profile.photoDataUrl} alt="صورة الطالب" /> : <UiIcon name="student" />}
          </div>
          <div className="guardian-mini-copy">
            <b>{name}</b>
            <span>{pageTitle(pathname)}</span>
          </div>
        </header>
      ) : null}

      {children}

      {bundle ? (
        <nav className="guardian-fixed-nav" aria-label="التنقل في صفحة الطالب">
          {navItems.map((item) => {
            const active = isHome ? hash === item.hash : item.hash === "more";
            return (
              <Link href={`/guardian#${item.hash}`} className={active ? "active" : ""} key={item.hash}>
                <UiIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
