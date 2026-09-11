"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyBehaviorAssessmentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/teacher/assessment");
  }, [router]);

  return <main className="shell inner-shell"><div className="empty-state">جاري فتح التقييم الشامل…</div></main>;
}
