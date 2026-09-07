"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";

export default function StudentsPage() {
  const { students, addStudent, archiveStudent, restoreStudent, deleteStudent } = useTaallamt();
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState<"active" | "special" | "archived" | "all">("active");

  const shown = useMemo(() => students.filter((student) => {
    const matches = student.name.includes(query.trim());
    if (!matches) return false;
    if (filter === "active") return student.active;
    if (filter === "special") return student.active && student.specialFollowUp;
    if (filter === "archived") return !student.active;
    return true;
  }), [students, query, filter]);

  function submit(event: FormEvent) {
    event.preventDefault();
    addStudent(newName);
    setNewName("");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">👥</div><div><h1>الطلاب</h1><p>إدارة قائمة الفصل والمتابعة</p></div></div>
        <Link className="btn secondary no-print" href="/">الرئيسية</Link>
      </header>

      <section className="card no-print">
        <form className="toolbar" onSubmit={submit}>
          <input className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الطالب الجديد" />
          <button className="btn" type="submit">+ إضافة طالب</button>
          <input className="field grow" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="البحث عن طالب..." />
        </form>
      </section>

      <div className="tabs no-print">
        <button className={`tab ${filter === "active" ? "active" : ""}`} onClick={() => setFilter("active")}>الحاليون</button>
        <button className={`tab ${filter === "special" ? "active" : ""}`} onClick={() => setFilter("special")}>متابعة خاصة</button>
        <button className={`tab ${filter === "archived" ? "active" : ""}`} onClick={() => setFilter("archived")}>المؤرشفون</button>
        <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>الكل</button>
      </div>

      <section className="list">
        {shown.map((student) => (
          <div key={student.id} className="row">
            <Link className="row-main grow" href={`/teacher/students/${student.id}`}>
              <div className="avatar">🧒</div>
              <div><h4>{student.name}</h4><small>{student.className} · أجهزة ولي الأمر {student.guardianDevices}/{student.guardianDeviceLimit}</small></div>
            </Link>
            <div className="mini-actions no-print">
              {student.specialFollowUp && <span className="badge red">متابعة خاصة</span>}
              {student.active ? <button className="btn secondary" onClick={() => archiveStudent(student.id)}>أرشفة</button> : <button className="btn secondary" onClick={() => restoreStudent(student.id)}>استعادة</button>}
              {!student.active && <button className="btn danger" onClick={() => { if (confirm(`حذف ${student.name} نهائيًا؟`)) deleteStudent(student.id); }}>حذف نهائي</button>}
            </div>
          </div>
        ))}
        {shown.length === 0 && <div className="notice">لا توجد نتائج بهذا التصنيف.</div>}
      </section>

      <section className="section"><div className="notice warn">الأرشفة هي الخيار الافتراضي عند خروج الطالب من الفصل حتى يبقى سجله السابق محفوظًا. الحذف النهائي متاح فقط للمؤرشفين وبقرار واضح.</div></section>
    </main>
  );
}
