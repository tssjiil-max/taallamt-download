import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./resources.css";
import "./taallamt-ui.css";
import "./guardian-profile.css";
import "./teacher-final-polish.css";
import "./guardian/guardian-layout-fix.css";
import "./teacher-unified.css";
import "./final-unified-ui.css";
import "./portfolio-polish.css";
import "./final-feature-polish.css";
import "./shell-redesign.css";
import "./strict-ui-fixes.css";
import "./strict-last-mile.css";
import { TaallamtProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "تعلّمت",
  description: "متابعة الطالب والتواصل والتحفيز",
  manifest: "/manifest.webmanifest",
  applicationName: "تعلّمت",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "تعلّمت" },
};

export const viewport: Viewport = { themeColor: "#1769aa", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><TaallamtProvider>{children}</TaallamtProvider></body>
    </html>
  );
}
