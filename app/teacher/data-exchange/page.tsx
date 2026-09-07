"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { useTaallamt } from "@/lib/store";
import type { MasteryLevel } from "@/lib/types";

const masteryLabels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  result.push(value.trim());
  return result;
}

export default function DataExchangePage() {
  const store = useTaallamt();
  const [previewName, setPreviewName] = useState("");
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState("");

  const activeTerm = store.terms.find((term) => term.active) ?? store.terms[0];
  const subjects = useMemo(
    () => store.subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id).sort((a, b) => a.order - b.order),
    [store.subjects, activeTerm?.id],
  );
  const activeStudents = store.students.filter((student) => student.active);

  function exportStudents() {
    const header = ["معرف الطالب", "اسم الطالب", "الفصل", "الحالة"];
    const rows = activeStudents.map((student) => [student.id, student.name, student.className, student.active ? "نشط" : "مؤرشف"]);
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadFile("taallamt-students.csv", csv, "text/csv;charset=utf-8");
  }

  function exportEvaluations() {
    const header = ["معرف الطالب", "اسم الطالب", "الفصل", "المادة", "التقييم"];
    const rows = activeStudents.flatMap((student) =>
      subjects.map((subject) => [
        student.id,
        student.name,
        student.className,
        subject.name,
        masteryLabels[student.subjectLevels[subject.id] ?? "partial"],
      ]),
    );
    const csv = "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    downloadFile("taallamt-evaluations.csv", csv, "text/csv;charset=utf-8");
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "taallamt",
      data: {
        terms: store.terms,
        subjects: store.subjects,
        students: store.students,
        weeklyPlans: store.weeklyPlans,
        followUps: store.followUps,
        messages: store.messages,
      },
    };
    downloadFile("taallamt-backup.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  async function previewImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreviewName(file.name);
    setPreviewRows([]);
    setPreviewError("");

    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(text);
        const students = parsed?.data?.students ?? parsed?.students;
        if (!Array.isArray(students)) throw new Error("لم أجد قائمة طلاب داخل الملف.");
        setPreviewRows([
          ["الاسم", "الفصل", "الحالة"],
          ...students.slice(0, 8).map((student: { name?: string; className?: string; active?: boolean }) => [
            student.name ?? "—",
            student.className ?? "—",
            student.active === false ? "مؤرشف" : "نشط",
          ]),
        ]);
        return;
      }

      const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).slice(0, 9);
      if (!lines.length) throw new Error("الملف فارغ.");
      setPreviewRows(lines.map(parseCsvLine));
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "تعذر قراءة الملف.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🔄</div><div><h1>نقل وتبادل البيانات</h1><p>تصدير، استيراد، معاينة وفحص قبل النقل</p></div></div>
        <Link className="btn secondary no-print" href="/">لوحة المعلم</Link>
      </header>

      <DateBar />

      <section className="hero section">
        <div>
          <h2>نقل آمن بدون فقد البيانات</h2>
          <p>نبدأ بملفات قابلة للمراجعة قبل الرفع لأي نظام خارجي. لا تُرسل بيانات الطلاب تلقائيًا إلى أي جهة خارجية من هذه الصفحة.</p>
        </div>
        <div className="hero-stats">
          <div className="stat"><b>{activeStudents.length}</b><span>طلاب جاهزون للتصدير</span></div>
          <div className="stat"><b>{subjects.length}</b><span>مواد مفعلة</span></div>
          <div className="stat"><b>CSV</b><span>يفتح في Excel</span></div>
          <div className="stat"><b>JSON</b><span>نسخة احتياطية كاملة</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>تصدير من تعلّمت</h2></div>
        <div className="grid">
          <div className="card"><div className="icon">👥</div><h3>قائمة الطلاب</h3><p>اسم الطالب، الفصل والحالة في ملف CSV مرتب.</p><button className="btn section no-print" type="button" onClick={exportStudents}>تصدير الطلاب</button></div>
          <div className="card"><div className="icon green">✅</div><h3>التقييمات</h3><p>كل طالب مع المادة ومستوى الإتقان الحالي، جاهز للمراجعة قبل النقل.</p><button className="btn section no-print" type="button" onClick={exportEvaluations}>تصدير التقييمات</button></div>
          <div className="card"><div className="icon amber">🛡️</div><h3>نسخة احتياطية</h3><p>نسخة JSON تشمل البيانات الحالية لإمكانية الاستعادة أو النقل لاحقًا.</p><button className="btn section no-print" type="button" onClick={exportBackup}>تنزيل نسخة احتياطية</button></div>
        </div>
      </section>

      <section className="section two">
        <div className="card">
          <div className="section-head"><h2>نور</h2><span className="badge warn">تجهيز ملف</span></div>
          <p>سنضبط قالب التصدير على الحقول الرسمية المطلوبة عند توفر نموذج ثابت ومؤكد. حاليًا لا يوجد إرسال تلقائي ولا حفظ لبيانات دخول نور.</p>
        </div>
        <div className="card">
          <div className="section-head"><h2>مدرستي / منصتي</h2><span className="badge warn">تجهيز ملف</span></div>
          <p>نفس المبدأ: تجهيز ملف متوافق، معاينته وفحصه أولًا، ثم الرفع بالطريقة الرسمية المتاحة دون تخزين كلمات المرور داخل تعلّمت.</p>
        </div>
      </section>

      <section className="section no-print">
        <div className="section-head"><h2>استيراد ومعاينة قبل الحفظ</h2></div>
        <div className="card stack">
          <p>اختر ملف CSV أو نسخة JSON. في هذه المرحلة سنقرأه محليًا للمعاينة فقط ولن نغيّر بيانات الفصل.</p>
          <input className="field" type="file" accept=".csv,.json,text/csv,application/json" onChange={previewImport} />
          {previewName && <span className="badge">{previewName}</span>}
          {previewError && <div className="notice warn">{previewError}</div>}
          {previewRows.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} style={{ borderBottom: "1px solid var(--line)", padding: "10px", fontWeight: rowIndex === 0 ? 700 : 400 }}>{cell || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="section"><div className="notice warn"><b>قاعدة النقل:</b> معاينة ← مطابقة أسماء الطلاب والحقول ← كشف النواقص والتكرار ← تأكيد المعلم ← تصدير/استيراد. لا نقل مباشر بصمت.</div></section>
    </main>
  );
}
