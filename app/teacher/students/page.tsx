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
    deleteStudent,
    saveFollowUp,
  } = useTaallamt();
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState<"active" | "special" | "archived">("active");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [notice, setNotice] = useState("");

  const shown = useMemo(
    () =>
      students.filter(
        (s) =>
          (filter === "archived" ? !s.active : s.active) &&
          s.name.includes(query.trim()),
      ),
    [students, query, filter],
  );

  const followUpCount = students.filter((student) => student.active && student.specialFollowUp).length;

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;
    addStudent(clean);
    setNewName("");
    setNotice(`تمت إضافة ${clean}.`);
  }

  function startEdit(id: string, name: string) {
    setDeleteId("");
    setEditingId(id);
    setEditName(name);
  }

  function saveEdit(id: string) {
    const clean = editName.trim();
    if (!clean) return;
    renameStudent(id, clean);
    setEditingId("");
    setEditName("");
    setNotice("تم تعديل اسم الطالب.");
  }

  function addToFollowUp(id: string) {
    const student = students.find((item) => item.id === id);
    if (!student || student.specialFollowUp) return;
    saveFollowUp({
      studentId: id,
      category: "learning",
      guardianStatement: "",
      schoolImpact: "",
      goal: "",
      plan: [],
      status: "needs_review",
      nextReviewAt: "",
      guardianVisible: true,
    });
    setNotice(`تمت إضافة ${student.name} إلى «يحتاج متابعة».`);
  }

  function confirmDelete(id: string) {
    const student = students.find((item) => item.id === id);
    deleteStudent(id);
    if (editingId === id) {
      setEditingId("");
      setEditName("");
    }
    setDeleteId("");
    setNotice(student ? `تم حذف ${student.name}.` : "تم حذف الطالب.");
  }

  return (
    <main className="shell inner-shell">
      <section className="inner-panel no-print">
        <div className="section-head"><div><h2>إدارة طلاب الفصل</h2><p>الملف والمتابعة وملف الإنجاز من مكان واحد.</p></div><span className="badge">{filter === "special" ? `${followUpCount} متابعة` : `${shown.length} طالب`}</span></div>
        <form className="student-add" onSubmit={submit}>
          <input className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الطالب الجديد" />
          <button className="btn" type="submit">إضافة طالب</button>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="البحث عن طالب..." />
        </form>
        <div className="segmented">
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")} type="button">كل الطلاب</button>
          <button className={filter === "special" ? "active" : ""} onClick={() => setFilter("special")} type="button">يحتاج متابعة</button>
          <button className={filter === "archived" ? "active" : ""} onClick={() => setFilter("archived")} type="button">الموقوفون</button>
        </div>
        {filter === "special" && <div className="notice student-follow-up-help">اختر الطالب من القائمة ثم اضغط «إضافة للمتابعة». الطلاب المحددون يظهر عليهم ✓.</div>}
        {notice && <div className="notice" role="status">{notice}</div>}
      </section>

      <section className="student-roster">
        {shown.map((s, i) => (
          <article className={`student-summary-card ${editingId === s.id ? "is-editing" : ""} ${s.specialFollowUp ? "has-follow-up" : ""}`} key={s.id}>
            <span className="student-number">{i + 1}</span>
            <div className="student-summary-copy">
              {editingId === s.id ? (
                <div className="student-inline-editor no-print">
                  <input className="field" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(s.id); if (e.key === "Escape") setEditingId(""); }} aria-label="اسم الطالب" />
                  <div className="mini-actions"><button className="btn" type="button" onClick={() => saveEdit(s.id)}>حفظ</button><button className="btn secondary" type="button" onClick={() => { setEditingId(""); setEditName(""); }}>إلغاء</button></div>
                </div>
              ) : (
                <h3>{s.name}</h3>
              )}
              <p>{s.className}</p>
              <small>{s.specialFollowUp ? "يحتاج متابعة خاصة" : "التقييم والمتابعة"}</small>
            </div>
            <div className="student-card-actions no-print">
              <Link className="student-open" href={`/teacher/students/${s.id}`}><span aria-hidden="true">⌁</span><span>الملف</span></Link>
              <Link className="student-portfolio-link" href={`/teacher/students/${s.id}/portfolio`}><span aria-hidden="true">★</span><span>الإنجاز</span></Link>
              {filter !== "archived" && <button className={`student-follow-up-toggle ${s.specialFollowUp ? "active" : ""}`} type="button" disabled={s.specialFollowUp} onClick={() => addToFollowUp(s.id)}><span aria-hidden="true">{s.specialFollowUp ? "✓" : "+"}</span><span>{s.specialFollowUp ? "في المتابعة" : "متابعة"}</span></button>}
              <button type="button" disabled={editingId === s.id} onClick={() => startEdit(s.id, s.name)}><span aria-hidden="true">✎</span><span>تعديل</span></button>
              <button type="button" onClick={() => s.active ? archiveStudent(s.id) : restoreStudent(s.id)}><span aria-hidden="true">{s.active ? "Ⅱ" : "↻"}</span><span>{s.active ? "إيقاف" : "استعادة"}</span></button>
              <button className="student-delete-action" type="button" onClick={() => { setEditingId(""); setDeleteId(s.id); }}><span aria-hidden="true">×</span><span>حذف</span></button>
            </div>
            {deleteId === s.id && <div className="inline-confirm student-delete-confirm no-print" role="dialog" aria-label={`تأكيد حذف ${s.name}`}>
              <div><b>حذف {s.name}؟</b><small>سيُحذف الطالب وبياناته المحلية المرتبطة من هذه النسخة.</small></div>
              <div className="mini-actions"><button className="btn danger" type="button" onClick={() => confirmDelete(s.id)}>تأكيد الحذف</button><button className="btn secondary" type="button" onClick={() => setDeleteId("")}>إلغاء</button></div>
            </div>}
          </article>
        ))}
        {!shown.length && <div className="empty-state">لا توجد نتائج.</div>}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
