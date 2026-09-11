"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!params.id) return;
    router.replace(`/teacher/students/${params.id}/assessment`);
  }, [params.id, router]);

  return <main className="shell inner-shell"><div className="empty-state">جاري فتح التقييم الشامل…</div></main>;
}
