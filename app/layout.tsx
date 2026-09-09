import type { Metadata } from "next";
import "./globals.css";
import "./resources.css";
import "./taallamt-ui.css";
import "./guardian-profile.css";
import "./teacher-final-polish.css";
import "./guardian/guardian-layout-fix.css";
import { TaallamtProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "تعلّمت",
  description: "متابعة الطالب والتواصل والتحفيز",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body><TaallamtProvider>{children}</TaallamtProvider></body>
    </html>
  );
}
