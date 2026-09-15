"use client";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";
import type { StudentFollowUpAction } from "@/lib/types";

type StudentFilter = "all" | "followup" | "guardian" | "counselor" | "vice" | "archived";

const filterLabels: Record<StudentFilter, string> = {
  all: "جميع الطلاب",
  followup: "يحتاجون متابعة",
  guardian: "تم التواصل مع ولي الأمر",
  counselor: "محالون للمرشد",
  vice: "محالون للوكيل",
  archived: "الموقوفون",
};

function hasAction(actions: StudentFollowUpAction[] | undefined, action: StudentFollowUpAction) {
  return Boolean(actions?.includes(action));
}

export default function StudentsPage() {
  const {
    students,
    messages,
    addStudent,
    renameStudent,
    archiveStudent,
    restoreStudent,
    deleteStudent,
  } = useTaallamt();
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("all");
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [notice, setNotice] = useState("");

  const shown = useMemo(() => {
    return students.filter((student) => {
      if (filter === "archived") {
        if (student.active) return false;
      } else if (!student.active) {
        return false;
      }

      if (!student.name.includes(query.trim())) return false;

      if (filter === "followup") {
        return student.specialFollowUp || hasAction(student.followUpActions, "needs_follow_up") || hasAction(student.followUpActions, "special_follow_up");
      }
      if (filter === "guardian") {
        return hasAction(student.followUpActions, "guardian_contact") || messages.some((message) => message.studentId === student.id && message.author === "teacher");
      }
      if (filter === "counselor") return hasAction(student.followUpActions, "counselor_referral");
      if (filter === "vice") return hasAction(student.followUpActions, "vice_principal_referral");
      return true;
    });
  }, [students, messages, query, filter]);

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

  function statusText(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    if (!student) return "التقييم الشامل";
    if (hasAction(student.followUpActions, "vice_principal_referral")) return "محال إلى الوكيل";
    if (hasAction(student.followUpActions, "counselor_referral")) return "محال إلى المرشد";
    if (student.specialFollowUp || hasAction(student.followUpActions, "needs_follow_up") || hasAction(student.followUpActions, "special_follow_up")) return "يحتاج متابعة";
    if (hasAction(student.followUpActions, "guardian_contact") || messages.some((message) => message.studentId === student.id && message.author === "teacher")) return "تم التواصل مع ولي الأمر";
    return "التقييم الشامل";
  }

  return (
    <main className="shell inner-shell">
      <section className="inner-panel no-print student-list-tools">
        <div className="section-head"><div><h2>طلاب الفصل</h2><p>اضغط اسم الطالب لفتح التقييم الشامل مباشرة.</p></div><span className="badge">{shown.length} طالب</span></div>
        <form className="student-add" onSubmit={submit}>
          <input className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الطالب الجديد" />
          <button className="btn" type="submit">إضافة طالب</button>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="البحث عن طالب..." />
        </form>
        <div className="student-filter-row" aria-label="فلترة الطلاب">
          {(["all", "followup", "guardian", "counselor", "vice"] as StudentFilter[]).map((item) => (
            <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} type="button" key={item}>{filterLabels[item]}</button>
          ))}
          <button className={filter === "archived" ? "active secondary-filter" : "secondary-filter"} onClick={() => setFilter("archived")} type="button">الموقوفون</button>
        </div>
        {notice && <div className="notice" role="status">{notice}</div>}
      </section>

      <section className="student-roster clean-student-roster">
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
                <h3><Link className="student-name-link" href={`/teacher/students/${s.id}/assessment`}>{s.name}</Link></h3>
              )}
              <p>{s.className}</p>
              <small>{statusText(s.id)}</small>
            </div>
            <div className="student-card-actions compact-student-actions no-print">
              <Link className="student-portfolio-link" href={`/teacher/students/${s.id}/portfolio`}><span aria-hidden="true">★</span><span>الإنجاز</span></Link>
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
        {!shown.length && <div className="empty-state">لا توجد نتائج ضمن هذا الفلتر.</div>}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
