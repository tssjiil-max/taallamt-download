"use client";

import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

export function StudentValues({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const week = academicWeek();
  const current = store.values.filter((item) => item.active && item.termId === store.activeTermId && week >= item.weekFrom && week <= item.weekTo);
  if (!current.length) return null;

  const value = current[0];
  const count = store.valueStars.filter((star) => star.studentId === studentId && star.valueId === value.id).length;
  const next = count >= 8 ? "أحسنت! وصلت للجائزة المميزة 🎉" : count >= 5 ? "أنت نجم الأسبوع 🌟" : count >= 3 ? "أنت بطل القيمة ⭐" : `اجمع ${3 - count} نجوم إضافية لتصبح بطل القيمة`;

  return (
    <section className="section">
      <div className="card">
        <div className="icon amber">🌟</div>
        <h3>تحدي القيم: {value.title}</h3>
        <p>{value.studentText}</p>
        <div className="section" style={{ fontSize: 24 }}>{"⭐".repeat(Math.min(count, 8)) || "☆ ☆ ☆"}</div>
        <div className="notice section">{next}</div>
      </div>
    </section>
  );
}
