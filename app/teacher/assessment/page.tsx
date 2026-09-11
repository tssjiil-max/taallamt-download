"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTaallamt } from "@/lib/store";

export default function AssessmentPage() {
  const store = useTaallamt();
  const router = useRouter();
  const firstStudent = store.students.find((item) => item.active);

  useEffect(() => {
    if (!store.ready || !firstStudent) return;
    router.replace(`/teacher/students/${firstStudent.id}/assessment`);
  }, [store.ready, firstStudent?.id, router]);

  if (!store.ready) {
    return <main className="shell inner-shell"><div className="empty-state">جاري فتح التقييم الشامل…</div></main>;
  }

  if (!firstStudent) {
    return (
      <main className="shell inner-shell">
        <div className="empty-state">لا يوجد طلاب نشطون لبدء التقييم.</div>
        <Link className="btn" href="/teacher/students">فتح قائمة الطلاب</Link>
      </main>
    );
  }

  return <main className="shell inner-shell"><div className="empty-state">جاري فتح التقييم الشامل…</div></main>;
}
