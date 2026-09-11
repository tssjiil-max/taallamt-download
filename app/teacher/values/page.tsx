"use client";

import { useEffect, useMemo, useState } from "react";
import { getTeacherMessages } from "@/lib/teacher-api";
import { useTaallamt } from "@/lib/store";
import type { BehaviorContext, BehaviorLevel, Message } from "@/lib/types";

const behaviors = [
  ["instructions", "الالتزام بالتعليمات"],
  ["discipline", "الانضباط داخل الصف"],
  ["respect", "احترام الآخرين"],
  ["participation", "المشاركة الإيجابية"],
  ["responsibility", "تحمل المسؤولية"],
  ["cooperation", "التعاون مع الزملاء"],
  ["property", "المحافظة على الممتلكات"],
  ["cleanliness", "النظافة والترتيب"],
  ["permission", "الاستئذان وآداب الحديث"],
  ["honesty", "الصدق والأمانة"],
] as const;

const labels: Record<BehaviorLevel, string> = {
  excellent: "متميز ⭐",
  good: "جيد ✓",
  needs_follow_up: "يحتاج متابعة",
};

const REWARD_TARGET = 30;

export default function BehaviorPage() {
  const store = useTaallamt();
  const students = store.students.filter((item) => item.active);
  const activeValues = store.values.filter((item) => item.active && item.termId === store.activeTermId);
  const [behaviorId, setBehaviorId] = useState("instructions");
  const [context, setContext] = useState<BehaviorContext>("classroom");
  const [showAll, setShowAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedValueId, setSelectedValueId] = useState("");
  const [starBusy, setStarBusy] = useState(false);
  const [remoteMessages, setRemoteMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!selectedStudentId && students[0]?.id) setSelectedStudentId(students[0].id);
  }, [selectedStudentId, students]);

  useEffect(() => {
    if (!selectedValueId && activeValues[0]?.id) setSelectedValueId(activeValues[0].id);
  }, [selectedValueId, activeValues]);

  useEffect(() => {
    let alive = true;
    getTeacherMessages()
      .then((result) => { if (alive) setRemoteMessages(result.messages); })
      .catch(() => { if (alive) setRemoteMessages([]); });
    return () => { alive = false; };
  }, []);

  const selected = behaviors.find((item) => item[0] === behaviorId) ?? behaviors[0];
  const shown = showAll ? behaviors : behaviors.slice(0, 5);
  const current = useMemo(
    () => new Map(
      store.behaviorEvaluations
        .filter((item) => item.behaviorId === behaviorId && item.context === context)
        .map((item) => [item.studentId, item.level]),
    ),
    [store.behaviorEvaluations, behaviorId, context],
  );

  const selectedStudent = students.find((item) => item.id === selectedStudentId);
  const selectedValue = activeValues.find((item) => item.id === selectedValueId);
  const studentStars = store.valueStars.filter((item) => item.studentId === selectedStudentId);
  const valueStars = studentStars.filter((item) => item.valueId === selectedValueId).length;
  const progress = Math.min(100, Math.round((studentStars.length / REWARD_TARGET) * 100));

  const homeMessages = useMemo(() => {
    const merged = [...store.messages, ...remoteMessages];
    const seen = new Set<string>();
    return merged
      .filter((item) => item.author === "guardian" && item.body.startsWith("تقييم المنزل:"))
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 8);
  }, [store.messages, remoteMessages]);

  function allGood() {
    students.forEach((student) => store.setBehaviorEvaluation(student.id, behaviorId, context, "good"));
    setNotice("تم تحديد الجميع «جيد». عدّل الاستثناءات فقط.");
  }

  async function addStar() {
    if (!selectedStudent || !selectedValue) {
      setNotice("اختر الطالب والقيمة أولًا.");
      return;
    }
    setStarBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/teacher/value-stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          className: selectedStudent.className,
          valueId: selectedValue.id,
          valueTitle: selectedValue.title,
          termId: selectedValue.termId,
          unitName: selectedValue.unitName,
          studentText: selectedValue.studentText,
          homeSuggestion: selectedValue.homeSuggestion,
          weekFrom: selectedValue.weekFrom,
          weekTo: selectedValue.weekTo,
          reason: selectedValue.title,
        }),
      });
      if (!response.ok) throw new Error("SAVE_FAILED");
      store.awardValueStar(selectedStudent.id, selectedValue.id, selectedValue.title);
      setNotice(`تمت إضافة نجمة لـ${selectedStudent.name} في «${selectedValue.title}».`);
    } catch {
      setNotice("تعذر حفظ النجمة في الخادم الآن. أعد المحاولة بعد التأكد من جلسة المعلم.");
    } finally {
      setStarBusy(false);
    }
  }

  async function removeStar() {
    if (!selectedStudent || !selectedValue || valueStars < 1) {
      if (valueStars < 1) setNotice("لا توجد نجمة في هذه القيمة لإنقاصها.");
      return;
    }
    setStarBusy(true);
    setNotice("");
    try {
      const query = new URLSearchParams({ studentId: selectedStudent.id, valueId: selectedValue.id });
      const response = await fetch(`/api/teacher/value-stars?${query.toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error("DELETE_FAILED");
      store.removeValueStar(selectedStudent.id, selectedValue.id);
      setNotice(`تم إنقاص نجمة من «${selectedValue.title}».`);
    } catch {
      setNotice("تعذر تحديث رصيد النجوم الآن.");
    } finally {
      setStarBusy(false);
    }
  }

  return (
    <main className="shell inner-shell behavior-page">
      <section className="inner-section">
        <div className="picker-block">
          <h2>اختر مكان الملاحظة</h2>
          <div className="subject-choice-row">
            <button className={context === "classroom" ? "active" : ""} type="button" onClick={() => setContext("classroom")}>داخل الفصل</button>
            <button className={context === "school" ? "active" : ""} type="button" onClick={() => setContext("school")}>داخل المدرسة</button>
            <button type="button" disabled>المنزل · يقيّمه ولي الأمر</button>
          </div>
        </div>
        <div className="picker-block">
          <h2>اختر السلوك</h2>
          <div className="assessment-skill-grid">
            {shown.map(([id, title]) => (
              <button className={behaviorId === id ? "active" : ""} type="button" key={id} onClick={() => setBehaviorId(id)}>
                <strong>{title}</strong>
              </button>
            ))}
          </div>
          <button className="soft-action" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? "إخفاء الإضافية" : "عرض جميع السلوكيات"}</button>
        </div>
      </section>

      {notice && <div className="notice" role="status">{notice}</div>}

      <section className="inner-section">
        <div className="inner-section-head">
          <div><h2>{selected[1]}</h2><span>{context === "classroom" ? "داخل الفصل" : "داخل المدرسة"}</span></div>
          <button className="btn" type="button" onClick={allGood}>تحديد الجميع: جيد ✓</button>
        </div>
        <div className="clean-eval-list behavior-eval-list">
          {students.map((student, index) => {
            const value = current.get(student.id) ?? "good";
            return (
              <article key={student.id}>
                <span className="student-number">{index + 1}</span>
                <div className="eval-name"><h3>{student.name}</h3><small>{labels[value]}</small></div>
                <div className="eval-choice behavior-choice">
                  {(["excellent", "good", "needs_follow_up"] as BehaviorLevel[]).map((level) => (
                    <button className={value === level ? "active" : ""} type="button" key={level} onClick={() => { store.setBehaviorEvaluation(student.id, behaviorId, context, level); setNotice(`تم تحديث ${student.name}: ${labels[level]}`); }}>{labels[level]}</button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="inner-section reward-center">
        <div className="inner-section-head">
          <div><h2>النجوم والمكافأة</h2><span>كل {REWARD_TARGET} نجمة = مكافأة</span></div>
          <span className="badge">⭐ {selectedStudent ? studentStars.length : 0}</span>
        </div>
        <div className="two reward-selectors">
          <label className="stack">الطالب
            <select className="field" value={selectedStudentId} onChange={(event) => { setSelectedStudentId(event.target.value); setNotice(""); }}>
              {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
            </select>
          </label>
          <label className="stack">القيمة
            <select className="field" value={selectedValueId} onChange={(event) => { setSelectedValueId(event.target.value); setNotice(""); }}>
              {activeValues.map((value) => <option value={value.id} key={value.id}>{value.title}</option>)}
            </select>
          </label>
        </div>
        {!activeValues.length ? <div className="empty-state compact-empty">لا توجد قيم مفعلة في الفصل الحالي.</div> : (
          <>
            <div className="reward-progress" aria-label={`تقدم المكافأة ${progress}%`}>
              <div className="reward-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="reward-progress-copy">
              <b>{studentStars.length} / {REWARD_TARGET} نجمة</b>
              <span>{selectedValue ? `«${selectedValue.title}»: ${valueStars} نجمة` : ""}</span>
            </div>
            <div className="reward-actions no-print">
              <button className="btn reward-add" type="button" disabled={starBusy || !selectedStudent || !selectedValue} onClick={() => void addStar()}>{starBusy ? "جاري الحفظ…" : "+ نجمة"}</button>
              <button className="btn secondary reward-remove" type="button" disabled={starBusy || valueStars < 1} onClick={() => void removeStar()}>− نجمة</button>
            </div>
          </>
        )}
      </section>

      <section className="inner-section">
        <div className="inner-section-head"><h2>تقييم المنزل من ولي الأمر</h2><span>متابعة مستقلة عن المحادثة</span></div>
        <div className="week-compact-list">
          {homeMessages.map((message) => (
            <div className="week-compact-row" key={message.id}>
              <b>{students.find((student) => student.id === message.studentId)?.name ?? "طالب"}</b>
              <p>{message.body}</p>
            </div>
          ))}
          {!homeMessages.length && <div className="empty-state compact-empty">لا توجد تقييمات منزلية بعد.</div>}
        </div>
      </section>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
