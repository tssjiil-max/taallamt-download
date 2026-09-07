import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "تعلّمت",
  description: "متابعة الطالب والتواصل والتحفيز",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
