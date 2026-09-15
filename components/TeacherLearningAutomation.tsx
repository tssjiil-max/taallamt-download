"use client";

import { useCallback, useEffect, useState } from "react";

type Settings = {
  autoWeeklyPlan: boolean;
  autoDailyAssignments: boolean;
  includeQuran: boolean;
  includeSkillPractice: boolean;
};

type CompletionStudent = { id: string; name: string };
type TeacherTask = {
  id: string;
  subject: string;
  lesson: string;
  taskText: string;
  skill?: string;
  source: "AUTO" | "MANUAL";
  completedCount: number;
  totalStudents: number;
  completedStudents: CompletionStudent[];
  pendingStudents: CompletionStudent[];
};

type WeekItem = {
  id: string;
  subject: string;
  unit?: string;
  lesson: string;
  expectedTask?: string;
  source: "AUTO" | "MANUAL";
  contentStatus: "READY" | "INCOMPLETE";
};

type Dashboard = {
  date: string;
  settings: Settings;
  status: { weeklyPlan: "PUBLISHED" | "NOT_PUBLISHED"; dailyAssignments: "PUBLISHED" | "NOT_PUBLISHED"; lastUpdated: string };
  today: { published: boolean; tasks: TeacherTask[]; incompleteSubjects: string[] };
  week: null | { week: number; weekStart: string; days: Array<{ day: string; date: string; subjects: WeekItem[] }> };
};

const smallButton: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "7px 10px",
  background: "#eef7ff",
  color: "#225f88",
  fontWeight: 700,
  cursor: "pointer",
};

function statusText(value: "PUBLISHED" | "NOT_PUBLISHED") {
  return value === "PUBLISHED" ? "منشورة" : "غير منشورة";
}

function formatTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function TeacherLearningAutomation() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/learning", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل الخطة والواجبات");
      setData(payload);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل الخطة والواجبات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/teacher/learning", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "تعذر حفظ التعديل");
  }

  async function editTask(task: TeacherTask) {
    const next = window.prompt("عدّل واجب اليوم. سيصبح التعديل اليدوي هو النسخة المعتمدة ولن تستبدله الأتمتة.", task.taskText);
    if (!next?.trim() || next.trim() === task.taskText) return;
    try {
      await patch({ action: "edit-task", date: data?.date, taskId: task.id, taskText: next.trim() });
      await load();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "تعذر حفظ التعديل");
    }
  }

  async function editWeekItem(item: WeekItem) {
    if (!data?.week) return;
    const current = item.expectedTask || item.lesson;
    const next = window.prompt("عدّل المطلوب المتوقع لهذا العنصر الأسبوعي.", current);
    if (!next?.trim() || next.trim() === current) return;
    try {
      await patch({ action: "edit-weekly", weekStart: data.week.weekStart, itemId: item.id, expectedTask: next.trim() });
      await load();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "تعذر حفظ التعديل");
    }
  }

  async function setSetting(key: keyof Settings, checked: boolean) {
    if (!data) return;
    setData({ ...data, settings: { ...data.settings, [key]: checked } });
    try {
      await patch({ action: "settings", [key]: checked });
      await load();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "تعذر حفظ الإعداد");
      await load();
    }
  }

  async function syncNow() {
    try {
      const response = await fetch("/api/teacher/learning", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر التحديث");
      await load();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : "تعذر التحديث");
    }
  }

  return (
    <section className="ref-card ref-panel" aria-label="الخطة والواجبات" style={{ marginTop: 16 }}>
      <div className="ref-title" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>🗓️ الخطة والواجبات</span>
        <button type="button" onClick={syncNow} disabled={loading} style={smallButton}>تحديث الآن</button>
      </div>

      {loading && !data ? <p>جاري تجهيز الخطة والواجبات…</p> : null}
      {error ? <div style={{ padding: 10, borderRadius: 12, background: "#fff4e8", marginTop: 10 }}>المحتوى غير مكتمل أو تعذر الاتصال: {error}</div> : null}

      {data ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
            <span className="ref-pill">الخطة الأسبوعية: {statusText(data.status.weeklyPlan)}</span>
            <span className="ref-pill">واجبات اليوم: {statusText(data.status.dailyAssignments)}</span>
            <span className="ref-pill">آخر تحديث: {formatTime(data.status.lastUpdated)}</span>
          </div>

          <div className="ref-two" style={{ alignItems: "start" }}>
            <div className="ref-card ref-panel" style={{ boxShadow: "none" }}>
              <h3>اليوم</h3>
              {data.today.tasks.length ? data.today.tasks.map((task) => (
                <div className="ref-list-row" key={task.id} style={{ gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <b>{task.subject}</b>
                    <div style={{ fontSize: 13 }}>{task.taskText}</div>
                    <small>{task.source === "MANUAL" ? "تعديل يدوي" : task.lesson}</small>
                  </div>
                  <button type="button" style={smallButton} onClick={() => void editTask(task)}>تعديل</button>
                </div>
              )) : <p>لا توجد واجبات منشورة لهذا اليوم.</p>}
              {data.today.incompleteSubjects.length ? (
                <small style={{ display: "block", marginTop: 8 }}>المحتوى غير مكتمل: {data.today.incompleteSubjects.join("، ")}</small>
              ) : null}
            </div>

            <div className="ref-card ref-panel" style={{ boxShadow: "none" }}>
              <h3>الإنجاز</h3>
              {data.today.tasks.length ? data.today.tasks.map((task) => (
                <details key={task.id} className="ref-list-row" style={{ display: "block" }}>
                  <summary style={{ cursor: "pointer" }}><b>{task.subject}</b> — {task.completedCount} / {task.totalStudents} أنجزوا</summary>
                  <div style={{ marginTop: 8, fontSize: 12 }}><b>أنجز:</b> {task.completedStudents.map((student) => student.name).join("، ") || "لا أحد بعد"}</div>
                  <div style={{ marginTop: 5, fontSize: 12 }}><b>لم ينجز:</b> {task.pendingStudents.map((student) => student.name).join("، ") || "الجميع أنجز"}</div>
                </details>
              )) : <p>تظهر نسب الإنجاز بعد نشر واجبات اليوم.</p>}
            </div>
          </div>

          <details style={{ marginTop: 12 }} open>
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>هذا الأسبوع {data.week ? `— الأسبوع ${data.week.week}` : ""}</summary>
            {data.week ? data.week.days.map((day) => (
              <div key={day.date} style={{ borderTop: "1px solid #edf0ee", padding: "10px 0" }}>
                <b>{day.day}</b>
                {day.subjects.map((item) => (
                  <div key={item.id} className="ref-list-row" style={{ gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <strong>{item.subject}</strong> — {item.lesson}
                      {item.expectedTask ? <small style={{ display: "block" }}>المتوقع: {item.expectedTask}</small> : null}
                      {item.contentStatus === "INCOMPLETE" ? <small>المحتوى غير مكتمل</small> : null}
                    </div>
                    {item.contentStatus === "READY" ? <button type="button" style={smallButton} onClick={() => void editWeekItem(item)}>تعديل</button> : null}
                  </div>
                ))}
              </div>
            )) : <p>لم تُنشر الخطة الأسبوعية بعد.</p>}
          </details>

          <div style={{ borderTop: "1px solid #edf0ee", marginTop: 14, paddingTop: 12 }}>
            <h3>إعدادات الأتمتة</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <label><input type="checkbox" checked={data.settings.autoWeeklyPlan} onChange={(event) => void setSetting("autoWeeklyPlan", event.target.checked)} /> إنشاء الخطة الأسبوعية تلقائيًا</label>
              <label><input type="checkbox" checked={data.settings.autoDailyAssignments} onChange={(event) => void setSetting("autoDailyAssignments", event.target.checked)} /> نشر واجبات اليوم تلقائيًا</label>
              <label><input type="checkbox" checked={data.settings.includeQuran} onChange={(event) => void setSetting("includeQuran", event.target.checked)} /> القرآن والحفظ</label>
              <label><input type="checkbox" checked={data.settings.includeSkillPractice} onChange={(event) => void setSetting("includeSkillPractice", event.target.checked)} /> التدريبات المرتبطة بالمهارات</label>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
