"use client";

import Link from "next/link";
import { useTaallamt } from "@/lib/store";
import type { ResourceKind } from "@/lib/types";

const labels: Record<ResourceKind, string> = {
  worksheet: "ورقة عمل",
  skills_practice: "تدريب مهارات",
  midterm: "اختبار نصفي",
  final: "اختبار نهائي",
};

export function GuardianResources({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const resources = store.resources.filter((resource) => resource.publishedToGuardian && resource.audienceStudentIds.includes(studentId));

  return (
    <section className="section">
      <div className="section-head"><h2>الأوراق والاختبارات</h2><span className="badge">{resources.length}</span></div>
      <div className="list">
        {resources.length === 0 && <div className="notice">لا توجد ورقة عمل أو اختبار مرسل من المعلم حاليًا.</div>}
        {resources.map((resource) => {
          const subject = store.subjects.find((item) => item.id === resource.subjectId);
          return (
            <Link className="row" key={resource.id} href={`/guardian/resources/${resource.id}`}>
              <div className="row-main"><div className="avatar">📝</div><div><h4>{resource.title}</h4><small>{subject?.name ?? "المادة"} · {labels[resource.kind]} · {new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(new Date(resource.createdAt))}</small></div></div>
              <span className="badge">فتح</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
