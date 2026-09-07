"use client";

import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

function reward(count: number) {
  if (count >= 8) return "🏆 جائزة مميزة";
  if (count >= 5) return "🌟 نجم الأسبوع";
  if (count >= 3) return "⭐ بطل القيمة";
  return `باقي ${Math.max(0, 3 - count)} للوصول إلى بطل القيمة`;
}

export function GuardianValues({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const week = academicWeek();
  const current = store.values.filter((item) => item.active && item.termId === store.activeTermId && week >= item.weekFrom && week <= item.weekTo);

  return (
    <section className="section">
      <div className="section-head"><h2>🌟 نجوم القيم</h2><span className="pill">الأسبوع {week}</span></div>
      {current.length === 0 ? <div className="notice">ستظهر هنا قيمة الوحدة عندما يحددها المعلم.</div> : <div className="grid">
        {current.map((value) => {
          const count = store.valueStars.filter((star) => star.studentId === studentId && star.valueId === value.id).length;
          return <div className="card" key={value.id}>
            <div className="icon amber">⭐</div>
            <h3>{value.title}</h3>
            <p>{value.studentText}</p>
            <div className="section"><b>{"⭐".repeat(Math.min(count, 8)) || "ابدأ بجمع النجوم"}</b></div>
            <div className="badge section">{reward(count)}</div>
            <div className="notice section"><b>في المنزل:</b> {value.homeSuggestion}</div>
          </div>;
        })}
      </div>}
      <small className="notification-note">المسابقة تشجع السلوك الإيجابي، ولا تعرض ترتيبًا علنيًا بين الطلاب.</small>
    </section>
  );
}
