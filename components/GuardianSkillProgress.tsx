"use client";

import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

export function GuardianSkillProgress({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const week = academicWeek();
  const skills = store.skills.filter((skill) => skill.active && skill.termId === store.activeTermId && skill.week === week);

  const rows = skills.map((skill) => {
    const history = store.assessments.filter((item) => item.studentId === studentId && item.skillId === skill.id);
    const latest = history.length ? history[history.length - 1] : undefined;
    const subject = store.subjects.find((item) => item.id === skill.subjectId);
    return { skill, latest, subject };
  }).filter((item) => item.latest);

  const needsTraining = rows.filter((item) => item.latest?.level === "needs_training");

  return (
    <>
      <section className="section">
        <div className="section-head"><h2>مهارات هذا الأسبوع</h2><span className="pill">الأسبوع {week}</span></div>
        <div className="list">
          {rows.length === 0 && <div className="notice">لم يُسجل تقييم مهاري لهذا الأسبوع بعد.</div>}
          {rows.slice(0, 10).map(({ skill, latest, subject }) => (
            <div className="row" key={skill.id}>
              <div><h4>{skill.title}</h4><small>{subject?.name ?? "المادة"} · {skill.category}</small></div>
              <span className={`badge ${latest?.level === "needs_training" ? "warn" : ""}`}>{latest ? labels[latest.level] : "—"}</span>
            </div>
          ))}
        </div>
      </section>

      {needsTraining.length > 0 && (
        <section className="section">
          <div className="section-head"><h2>الخطة العلاجية المقترحة تلقائيًا</h2><span className="badge warn">{needsTraining.length} مهارة</span></div>
          <div className="card">
            <p>بناءً على آخر تقييمات المعلم لهذا الأسبوع، نركز في المنزل على المهارات التالية:</p>
            <ul>{needsTraining.map(({ skill }) => <li key={skill.id} style={{ marginBottom: 8 }}>{skill.title}</li>)}</ul>
            <div className="kv"><span>المدة</span><span>5–7 دقائق يوميًا لكل تدريب، بدون ضغط أو إطالة.</span></div>
            <div className="kv"><span>الطريقة</span><span>تدريب قصير، محاولة مستقلة، ثم تعزيز مباشر ومراجعة في نهاية الأسبوع.</span></div>
            <div className="notice warn">هذه خطة تعليمية مساندة وتُحدّث تلقائيًا مع التقييمات الجديدة.</div>
          </div>
        </section>
      )}
    </>
  );
}
