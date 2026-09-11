"use client";
import { useMemo, useState } from "react";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const levels: MasteryLevel[] = ["mastered", "needs_training"];
const labels: Record<MasteryLevel, string> = {
  mastered: "أتقن",
  partial: "يحتاج تدريب",
  needs_training: "يحتاج تدريب",
};

function latest(
  assessments: ReturnType<typeof useTaallamt>["assessments"],
  studentId: string,
  skillId: string,
) {
  const found = assessments
    .filter((item) => item.studentId === studentId && item.skillId === skillId)
    .at(-1)?.level;
  return found === "partial" ? "needs_training" : found;
}

export default function AssessmentPage() {
  const store = useTaallamt();
  const term = store.terms.find((item) => item.active) ?? store.terms[0];
  const subjects = store.subjects
    .filter((item) => item.enabled && item.termId === term?.id)
    .sort((a, b) => a.order - b.order);

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "quran");
  const [week, setWeek] = useState(academicWeek());
  const [skillId, setSkillId] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const skills = store.skills.filter(
    (item) =>
      item.active &&
      item.termId === term?.id &&
      item.subjectId === subjectId &&
      item.week === week,
  );
  const skill = skills.find((item) => item.id === skillId) ?? skills[0];
  const students = store.students.filter((item) => item.active);

  const stats = useMemo(() => {
    if (!skill) return { mastered: 0, needs: 0, pending: students.length };
    const values = students.map((student) => latest(store.assessments, student.id, skill.id));
    return {
      mastered: values.filter((value) => value === "mastered").length,
      needs: values.filter((value) => value === "needs_training").length,
      pending: values.filter((value) => !value).length,
    };
  }, [skill, students, store.assessments]);

  async function persist(studentId: string, level: MasteryLevel) {
    if (!skill) return;
    const response = await fetch("/api/teacher/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, skillId: skill.id, level }),
    });
    if (!response.ok) throw new Error("save");
    store.setSkillAssessment(studentId, skill.id, level);
  }

  async function save(studentId: string, level: MasteryLevel) {
    if (!skill) return;
    setSaving(`${studentId}:${skill.id}`);
    setNotice("");
    try {
      await persist(studentId, level);
      setNotice(level === "mastered" ? "تم حفظ «أتقن»." : "تم الحفظ وإضافة الطالب للمتابعة.");
    } catch {
      setNotice("تعذر حفظ التقييم. أعد المحاولة.");
    } finally {
      setSaving("");
    }
  }

  function requestApplyToAll() {
    if (!skill) return;
    setBulkConfirmOpen(true);
  }

  async function confirmApplyToAll() {
    if (!skill) return;
    setBulkConfirmOpen(false);
    setSaving("all");
    setNotice("");
    try {
      for (const student of students) await persist(student.id, "mastered");
      setNotice("تم تسجيل «أتقن» للجميع. عدّل الاستثناءات فقط.");
    } catch {
      setNotice("توقف الحفظ قبل اكتماله. راجع النتائج ثم أعد المحاولة.");
    } finally {
      setSaving("");
    }
  }

  return (
    <main className="shell inner-shell">
      <section className="subject-stat-strip">
        <span><b>{stats.mastered}</b>أتقن</span>
        <span><b>{stats.needs}</b>يحتاج تدريب</span>
        <span><b>{stats.pending}</b>لم يقيّم</span>
      </section>
      {notice && <div className="notice">{notice}</div>}
      <section className="inner-section assessment-picker">
        <div className="picker-block">
          <h2>1. المادة</h2>
          <div className="subject-choice-row">
            {subjects.map((subject) => (
              <button
                className={subjectId === subject.id ? "active" : ""}
                key={subject.id}
                onClick={() => {
                  setSubjectId(subject.id);
                  setSkillId("");
                }}
              >
                {subject.name}
              </button>
            ))}
          </div>
        </div>
        <div className="picker-block">
          <h2>2. الأسبوع</h2>
          <div className="week-pills">
            {Array.from({ length: 17 }, (_, index) => index + 1).map((number) => (
              <button
                className={week === number ? "active" : ""}
                key={number}
                onClick={() => {
                  setWeek(number);
                  setSkillId("");
                }}
              >
                {number}
              </button>
            ))}
          </div>
        </div>
        <div className="picker-block">
          <h2>3. مهارة الدرس</h2>
          {skills.length ? (
            <div className="assessment-skill-grid">
              {skills.map((item) => (
                <button
                  className={skill?.id === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => setSkillId(item.id)}
                >
                  <strong>{item.category}</strong>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">لا توجد مهارة لهذه المادة في الأسبوع {week}.</div>
          )}
        </div>
      </section>
      <section className="inner-section">
        <div className="inner-section-head">
          <div>
            <h2>{skill ? `تقييم: ${skill.category}` : "تقييم الطلاب"}</h2>
            <span>{students.length} طالبًا</span>
          </div>
          {skill && (
            <button
              className="btn mastery-all"
              disabled={saving === "all"}
              onClick={requestApplyToAll}
            >
              أتقن الكل
            </button>
          )}
        </div>
        {skill ? (
          <div className="clean-eval-list">
            {students.map((student, index) => {
              const value = latest(store.assessments, student.id, skill.id);
              const rowSaving = saving === `${student.id}:${skill.id}`;
              return (
                <article key={student.id}>
                  <span className="student-number">{index + 1}</span>
                  <div className="eval-name">
                    <h3>{student.name}</h3>
                    <small>{rowSaving ? "جاري الحفظ…" : value ? labels[value] : "لم يقيّم بعد"}</small>
                  </div>
                  <div className="eval-choice">
                    {levels.map((level) => (
                      <button
                        className={value === level ? `active ${level}` : ""}
                        disabled={rowSaving || saving === "all"}
                        key={level}
                        onClick={() => void save(student.id, level)}
                      >
                        {labels[level]}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">اختر مهارة أولًا.</div>
        )}
      </section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      {bulkConfirmOpen && (
        <div className="teacher-modal-backdrop" role="presentation" onClick={() => setBulkConfirmOpen(false)}>
          <section
            className="teacher-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teacher-modal-icon" aria-hidden="true">✓</div>
            <h3 id="bulk-confirm-title">تسجيل «أتقن» لجميع الطلاب؟</h3>
            <p>سيتم حفظ الإتقان للجميع، وبعدها تعدّل فقط الطلاب الذين يحتاجون تدريبًا.</p>
            <div className="teacher-modal-actions">
              <button className="btn secondary" type="button" onClick={() => setBulkConfirmOpen(false)}>إلغاء</button>
              <button className="btn" type="button" onClick={() => void confirmApplyToAll()}>تأكيد الحفظ</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
