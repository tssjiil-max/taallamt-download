"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function AppInstallPanel({ compact = false }: { compact?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
    const ready = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const done = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return compact ? null : <div className="app-install-card installed"><b>✓ تطبيق تعلّمت مثبت</b><span>يفتح كبرنامج مستقل من جهازك.</span></div>;

  return <section className={`app-install-card no-print ${compact ? "compact" : ""}`}>
    <div><b>ثبّت «تعلّمت» كتطبيق</b><span>على الجوال أو سطح المكتب، مع وصول أسرع للإشعارات.</span></div>
    {promptEvent ? <button type="button" onClick={install}>تثبيت التطبيق</button> : ios ? <small>من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية».</small> : <small>افتح قائمة المتصفح واختر «تثبيت التطبيق» عند ظهورها.</small>}
  </section>;
}
