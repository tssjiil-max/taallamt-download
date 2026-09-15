"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";
import {
  TEACHER_ROSTER_SLOT_COUNT,
  assignStudentToSlot,
  isTeacherRosterExcludedId,
  makeInitialTeacherRosterSlots,
  normalizeTeacherRosterSlots,
  removeStudentFromSlots,
  teacherStudentDisplayName,
  type TeacherRosterSlots,
} from "@/lib/teacher-roster";
import type { Student, StudentFollowUpAction } from "@/lib/types";

type StudentFilter = "all" | "followup" | "guardian" | "counselor" | "vice" | "archived";
type ArchivedSlots = Record<string, number>;
type RosterRow = { slotIndex: number; student: Student };

const ROSTER_STORAGE_KEY = "taallamt-teacher-roster-slots-v1";

const filterLabels: Record<StudentFilter, string> = {
  all: "جميع الطلاب",
  followup: "يحتاجون متابعة",
  guardian: "تم التواصل مع ولي الأمر",
  counselor: "محالون للمرشد",
  vice: "محالون للوكيل",
  archived: "المؤرشفون",
};

function hasAction(actions: StudentFollowUpAction[] | undefined, action: StudentFollowUpAction) {
  return Boolean(actions?.includes(action));
}

function sameSlots(a: TeacherRosterSlots, b: TeacherRosterSlots) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameArchivedSlots(a: ArchivedSlots, b: ArchivedSlots) {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  return aEntries.length === bEntries.length && aEntries.every(([id, slot]) => b[id] === slot);
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
  const [slots, setSlots] = useState<TeacherRosterSlots>(() => makeInitialTeacherRosterSlots());
  const [archivedSlots, setArchivedSlots] = useState<ArchivedSlots>({});
  const [rosterReady, setRosterReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROSTER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { slots?: unknown; archivedSlots?: unknown };
        const normalized = normalizeTeacherRosterSlots(parsed.slots);
        if (normalized) setSlots(normalized);
        if (parsed.archivedSlots && typeof parsed.archivedSlots === "object" && !Array.isArray(parsed.archivedSlots)) {
          const clean: ArchivedSlots = {};
          Object.entries(parsed.archivedSlots as Record<string, unknown>).forEach(([id, value]) => {
            if (Number.isInteger(value) && Number(value) >= 0 && Number(value) < TEACHER_ROSTER_SLOT_COUNT) clean[id] = Number(value);
          });
          setArchivedSlots(clean);
        }
      }
    } catch {}
    setRosterReady(true);
  }, []);

  useEffect(() => {
    if (!rosterReady) return;
    try {
      localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify({ slots, archivedSlots }));
    } catch {}
  }, [slots, archivedSlots, rosterReady]);

  useEffect(() => {
    if (!rosterReady) return;
    const currentStudentById = new Map(students.map((student) => [student.id, student]));
    let nextSlots = [...slots];
    const nextArchived = { ...archivedSlots };

    nextSlots.forEach((studentId, slotIndex) => {
      if (!studentId) return;
      const student = currentStudentById.get(studentId);
      if (!student || isTeacherRosterExcludedId(studentId)) {
        nextSlots[slotIndex] = null;
        delete nextArchived[studentId];
        return;
      }
      if (!student.active) {
        nextSlots[slotIndex] = null;
        if (nextArchived[studentId] === undefined) nextArchived[studentId] = slotIndex;
      }
    });

    const occupied = new Set(nextSlots.filter((id): id is string => Boolean(id)));
    students.forEach((student) => {
      if (!student.active || isTeacherRosterExcludedId(student.id) || occupied.has(student.id)) return;
      const preferred = nextArchived[student.id];
      const assigned = assignStudentToSlot(nextSlots, student.id, preferred);
      if (!sameSlots(assigned, nextSlots)) {
        nextSlots = assigned;
        occupied.add(student.id);
        delete nextArchived[student.id];
      }
    });

    Object.keys(nextArchived).forEach((studentId) => {
      const student = currentStudentById.get(studentId);
      if (!student || isTeacherRosterExcludedId(studentId) || student.active) delete nextArchived[studentId];
    });

    if (!sameSlots(nextSlots, slots)) setSlots(nextSlots);
    if (!sameArchivedSlots(nextArchived, archivedSlots)) setArchivedSlots(nextArchived);
  }, [students, rosterReady, slots, archivedSlots]);

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);

  const activeRows = useMemo<RosterRow[]>(() => {
    return slots.flatMap((studentId, slotIndex) => {
      if (!studentId) return [];
      const student = studentById.get(studentId);
      if (!student?.active || isTeacherRosterExcludedId(student.id)) return [];
      return [{ slotIndex, student }];
    });
  }, [slots, studentById]);

  const archivedRows = useMemo<RosterRow[]>(() => {
    return students
      .filter((student) => !student.active && !isTeacherRosterExcludedId(student.id))
      .map((student, index) => ({ slotIndex: archivedSlots[student.id] ?? index, student }))
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }, [students, archivedSlots]);

  const shown = useMemo<RosterRow[]>(() => {
    const cleanQuery = query.trim();
    if (filter === "archived") {
      return archivedRows.filter(({ student }) => !cleanQuery || teacherStudentDisplayName(student).includes(cleanQuery));
    }

    return activeRows.filter(({ student }) => {
      if (cleanQuery && !teacherStudentDisplayName(student).includes(cleanQuery)) return false;
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
  }, [activeRows, archivedRows, messages, query, filter]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) return;
    if (activeRows.length >= TEACHER_ROSTER_SLOT_COUNT || !slots.includes(null)) {
      setNotice("جميع الخانات الثلاثين مشغولة. احذف أو أرشف طالبًا أولًا.");
      return;
    }
    addStudent(clean);
    setNewName("");
    setNotice(`تمت إضافة ${clean} في أول خانة متاحة.`);
  }

  function startEdit(id: string, name: string) {
    setDeleteId("");
    setEditingId(id);
    setEditName(teacherStudentDisplayName({ id, name }));
  }

  function saveEdit(id: string) {
    const clean = editName.trim();
    if (!clean) return;
    renameStudent(id, clean);
    setEditingId("");
    setEditName("");
    setNotice("تم تعديل اسم الطالب.");
  }

  function archiveFromSlot(studentId: string, slotIndex: number) {
    setSlots((current) => removeStudentFromSlots(current, studentId));
    setArchivedSlots((current) => ({ ...current, [studentId]: slotIndex }));
    archiveStudent(studentId);
    setNotice("تمت أرشفة الطالب مع الاحتفاظ ببياناته.");
  }

  function restoreArchived(studentId: string) {
    if (activeRows.length >= TEACHER_ROSTER_SLOT_COUNT || !slots.includes(null)) {
      setNotice("لا توجد خانة فارغة لاستعادة الطالب.");
      return;
    }
    const preferred = archivedSlots[studentId];
    setSlots((current) => assignStudentToSlot(current, studentId, preferred));
    setArchivedSlots((current) => {
      const next = { ...current };
      delete next[studentId];
      return next;
    });
    restoreStudent(studentId);
    setNotice("تمت استعادة الطالب إلى القائمة النشطة.");
  }

  function confirmDelete(id: string) {
    const student = students.find((item) => item.id === id);
    setSlots((current) => removeStudentFromSlots(current, id));
    setArchivedSlots((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    deleteStudent(id);
    if (editingId === id) {
      setEditingId("");
      setEditName("");
    }
    setDeleteId("");
    setNotice(student ? `تم حذف ${teacherStudentDisplayName(student)}.` : "تم حذف الطالب.");
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

  function renderStudentCard(student: Student, slotIndex: number, archived = false) {
    const displayName = teacherStudentDisplayName(student);
    return (
      <article className={`student-summary-card ${editingId === student.id ? "is-editing" : ""} ${student.specialFollowUp ? "has-follow-up" : ""}`} key={student.id}>
        <span className="student-number">{slotIndex + 1}</span>
        <div className="student-summary-copy">
          {editingId === student.id ? (
            <div className="student-inline-editor no-print">
              <input className="field" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(student.id); if (e.key === "Escape") setEditingId(""); }} aria-label="اسم الطالب" />
              <div className="mini-actions"><button className="btn" type="button" onClick={() => saveEdit(student.id)}>حفظ</button><button className="btn secondary" type="button" onClick={() => { setEditingId(""); setEditName(""); }}>إلغاء</button></div>
            </div>
          ) : archived ? (
            <h3>{displayName}</h3>
          ) : (
            <h3><Link className="student-name-link" href={`/teacher/students/${student.id}/assessment`}>{displayName}</Link></h3>
          )}
          <p>{student.className}</p>
          <small>{archived ? "مؤرشف" : statusText(student.id)}</small>
        </div>
        <div className="student-card-actions compact-student-actions no-print">
          {!archived && <Link className="student-portfolio-link" href={`/teacher/students/${student.id}/portfolio`}><span aria-hidden="true">★</span><span>الإنجاز</span></Link>}
          <button type="button" disabled={editingId === student.id} onClick={() => startEdit(student.id, student.name)}><span aria-hidden="true">✎</span><span>تعديل</span></button>
          {archived ? (
            <button type="button" onClick={() => restoreArchived(student.id)}><span aria-hidden="true">↻</span><span>استعادة</span></button>
          ) : (
            <button type="button" onClick={() => archiveFromSlot(student.id, slotIndex)}><span aria-hidden="true">▣</span><span>أرشفة</span></button>
          )}
          <button className="student-delete-action" type="button" onClick={() => { setEditingId(""); setDeleteId(student.id); }}><span aria-hidden="true">×</span><span>حذف</span></button>
        </div>
        {deleteId === student.id && <div className="inline-confirm student-delete-confirm no-print" role="dialog" aria-label={`تأكيد حذف ${displayName}`}>
          <div><b>حذف {displayName}؟</b><small>سيُحذف الطالب وبياناته المحلية المرتبطة من هذه النسخة، بينما الأرشفة تحتفظ بالبيانات.</small></div>
          <div className="mini-actions"><button className="btn danger" type="button" onClick={() => confirmDelete(student.id)}>تأكيد الحذف</button><button className="btn secondary" type="button" onClick={() => setDeleteId("")}>إلغاء</button></div>
        </div>}
      </article>
    );
  }

  const showFixedSlots = filter === "all" && !query.trim();

  return (
    <main className="shell inner-shell">
      <section className="inner-panel no-print student-list-tools">
        <div className="section-head"><div><h2>طلاب الفصل</h2><p>30 خانة ثابتة. اضغط اسم الطالب لفتح التقييم الشامل مباشرة.</p></div><span className="badge">{activeRows.length}/{TEACHER_ROSTER_SLOT_COUNT} طالب</span></div>
        <form className="student-add" onSubmit={submit}>
          <input className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الطالب الجديد" />
          <button className="btn" type="submit">إضافة طالب</button>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="البحث عن طالب..." />
        </form>
        <div className="student-filter-row" aria-label="فلترة الطلاب">
          {(["all", "followup", "guardian", "counselor", "vice"] as StudentFilter[]).map((item) => (
            <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} type="button" key={item}>{filterLabels[item]}</button>
          ))}
          <button className={filter === "archived" ? "active secondary-filter" : "secondary-filter"} onClick={() => setFilter("archived")} type="button">المؤرشفون ({archivedRows.length})</button>
        </div>
        {notice && <div className="notice" role="status">{notice}</div>}
      </section>

      <section className="student-roster clean-student-roster">
        {showFixedSlots ? slots.map((studentId, slotIndex) => {
          const student = studentId ? studentById.get(studentId) : undefined;
          if (student?.active && !isTeacherRosterExcludedId(student.id)) return renderStudentCard(student, slotIndex);
          return (
            <article className="student-summary-card is-empty-slot" key={`empty-${slotIndex}`}>
              <span className="student-number">{slotIndex + 1}</span>
              <div className="student-summary-copy"><h3>خانة فارغة</h3><p>متاحة لإضافة طالب</p><small>تبقى الخانة محفوظة ضمن العدد 30</small></div>
            </article>
          );
        }) : shown.map(({ student, slotIndex }) => renderStudentCard(student, slotIndex, filter === "archived"))}
        {!showFixedSlots && !shown.length && <div className="empty-state">لا توجد نتائج ضمن هذا الفلتر.</div>}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
