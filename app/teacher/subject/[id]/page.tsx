"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

type Tab = "week" | "skills" | "resources" | "spelling";

export default function SubjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const store = useTaallamt();
  const subject = store.subjects.find((item) => item.id === id);
  const term = store.terms.find((item) => item.active) ?? store.terms[0];
  const plans = store.weeklyPlans
    .filter((item) => item.subjectId === id && item.termId === term?.id)
    .sort((a, b) => a.week - b.week);
  const [week, setWeek] = useState(Math.max(1, Math.min(17, academicWeek())));
  const [tab, setTab] = useState<Tab>("week");

  const plan = plans.find((item) => item.week === week);
  const skills = store.skills.filter(
    (item) => item.active && item.termId === term?.id && item.subjectId === id && item.week === week,
  );

  if (!subject) {
    return <main className="shell"><div className="empty-state">المادة غير موجودة</div></main>;
  }

  const lughati = subject.name.includes("لغتي");
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "week", label: "الأسبوع والدرس" },
    { id: "skills", label: "المهارات" },
    { id: "resources", label: "الأوراق والمكتبة" },
    ...(lughati ? [{ id: "spelling" as Tab, label: "الإملاء والخط" }] : []),
  ];

  return (
    <main className="shell inner-shell">
      <section className="subject-context-strip">
        <div><small>المادة</small><b>{subject.name}</b></div>
        <div><small>الأسبوع</small><b>{week}</b></div>
        <div className="grow"><small>الدرس الحالي</small><b>{plan?.title ?? "لا يوجد درس مسجل"}</b></div>
      </section>

      <section className="notice subject-assessment-moved no-print">
        <div>
          <b>تقييم الطلاب أصبح موحدًا داخل «التقييم الشامل».</b>
          <span>المواد والسلوك والقيم والمتابعة تُدار من ملف الطالب نفسه دون تكرار قائمة الطلاب.</span>
        </div>
        <Link className="btn" href="/teacher/students">فتح قائمة الطلاب</Link>
      </section>

      <nav className="subject-tab-grid no-print">
        {tabs.map((item) => (
          <button type="button" className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)} key={item.id}>{item.label}</button>
        ))}
      </nav>

      {tab === "week" && (
        <section className="inner-section">
          <div className="inner-section-head"><h2>خطة الأسابيع</h2><span>17 أسبوعًا</span></div>
          <div className="plan-grid">
            {plans.map((item) => (
              <button type="button" className={week === item.week ? "active" : ""} onClick={() => setWeek(item.week)} key={item.id}>
                <b>{item.week}</b><strong>{item.title}</strong><span>{week === item.week ? "محدد" : "فتح"}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "skills" && (
        <section className="inner-section">
          <div className="inner-section-head"><h2>مهارات الأسبوع {week}</h2><span>{skills.length}</span></div>
          <div className="skill-list">
            {skills.map((item) => <article key={item.id}><b>{item.category}</b><p>{item.title}</p></article>)}
            {!skills.length && <div className="empty-state">لا توجد مهارات مسجلة لهذا الأسبوع.</div>}
          </div>
        </section>
      )}

      {tab === "resources" && (
        <section className="inner-section">
          <div className="inner-section-head"><h2>الأوراق والمكتبة</h2></div>
          <div className="inner-action-grid">
            <Link href="/teacher/resources"><img src="/guardian-icons/followup.svg" alt="" /><b>إنشاء تدريب أو ورقة عمل</b></Link>
            <Link href="/teacher/library"><img src="/guardian-icons/library.svg" alt="" /><b>المكتبة</b></Link>
            <Link href="/teacher/distribution"><img src="/guardian-icons/lughati.svg" alt="" /><b>التوزيع الأسبوعي</b></Link>
          </div>
        </section>
      )}

      {tab === "spelling" && lughati && (
        <section className="inner-section">
          <div className="feature-link">
            <img src="/guardian-icons/lughati.svg" alt="" />
            <div><h2>الإملاء والخط</h2><p>المهارة والتدريب ومعايير الخط.</p></div>
            <Link href="/teacher/spelling-handwriting">فتح</Link>
          </div>
        </section>
      )}

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
