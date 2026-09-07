"use client";

import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

export function GuardianSpellingPractice() {
  const store = useTaallamt();
  const week = academicWeek();
  const practice = store.spellingPractices.find((item) => item.active && item.termId === store.activeTermId && item.week === week);

  if (!practice) return null;

  return (
    <section className="section">
      <div className="section-head"><h2>✍️ الإملاء والخط</h2><span className="pill">الأسبوع {week}</span></div>
      <div className="card">
        <div className="kv"><span>الوحدة</span><b>{practice.unitName}</b></div>
        <div className="kv"><span>مهارة الإملاء</span><b>{practice.skill}</b></div>
        <div className="kv"><span>الدرجة</span><span>{practice.scoreTotal}/10</span></div>
        <h3 className="section">هدف الخط هذا الأسبوع</h3>
        <ul>{practice.handwritingChecklist.slice(0, 4).map((item) => <li key={item} style={{ marginBottom: 7 }}>{item}</li>)}</ul>
        <div className="notice section">التدريب مرتبط بكتيب الإملاء والخط، ويظهر هنا كجزء من مادة لغتي وليس كمادة مستقلة.</div>
      </div>
    </section>
  );
}
