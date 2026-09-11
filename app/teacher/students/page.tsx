"use client";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";
export default function StudentsPage() {
  const {
    students,
    addStudent,
    renameStudent,
    archiveStudent,
    restoreStudent,
  } = useTaallamt();
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState<"active" | "special" | "archived">(
    "active",
  );
  const shown = useMemo(
    () =>
      students.filter(
        (s) =>
          (filter === "archived" ? !s.active : s.active) &&
          s.name.includes(query.trim()) &&
          (filter !== "special" || s.specialFollowUp),
      ),
    [students, query, filter],
  );
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    addStudent(newName);
    setNewName("");
  }
  return (
    <main className="shell inner-shell">
      <section className="inner-panel no-print">
        <div className="section-head"><div><h2>إدارة طلاب الفصل</h2><p>الملف والمتابعة وملف الإنجاز من مكان واحد.</p></div><span className="badge">{shown.length} طالب</span></div>
        <form className="student-add" onSubmit={submit}>
          <input
            className="field"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم الطالب الجديد"
          />
          <button className="btn" type="submit">
            إضافة طالب
          </button>
          <input
            className="field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="البحث عن طالب..."
          />
        </form>
        <div className="segmented">
          <button
            className={filter === "active" ? "active" : ""}
            onClick={() => setFilter("active")}
            type="button"
          >
            كل الطلاب
          </button>
          <button
            className={filter === "special" ? "active" : ""}
            onClick={() => setFilter("special")}
            type="button"
          >
            يحتاج متابعة
          </button>
          <button
            className={filter === "archived" ? "active" : ""}
            onClick={() => setFilter("archived")}
            type="button"
          >
            الموقوفون
          </button>
        </div>
      </section>
      <section className="student-roster">
        {shown.map((s, i) => (
          <article className="student-summary-card" key={s.id}>
            <span className="student-number">{i + 1}</span>
            <div className="student-summary-copy">
              <h3>{s.name}</h3>
              <p>{s.className}</p>
              <small>
                {s.specialFollowUp ? "يحتاج متابعة خاصة" : "التقييم والمتابعة"}
              </small>
            </div>
            <div className="student-card-actions no-print">
              <Link className="student-open" href={`/teacher/students/${s.id}`}>
                <span aria-hidden="true">⌁</span><span>الملف</span>
              </Link>
              <Link className="student-portfolio-link" href={`/teacher/students/${s.id}/portfolio`}>
                <span aria-hidden="true">★</span><span>الإنجاز</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  const name = prompt("اسم الطالب", s.name);
                  if (name) renameStudent(s.id, name);
                }}
              >
                <span aria-hidden="true">✎</span><span>تعديل</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  s.active ? archiveStudent(s.id) : restoreStudent(s.id)
                }
              >
                <span aria-hidden="true">{s.active ? "Ⅱ" : "↻"}</span><span>{s.active ? "إيقاف" : "استعادة"}</span>
              </button>
            </div>
          </article>
        ))}
        {!shown.length && <div className="empty-state">لا توجد نتائج.</div>}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
