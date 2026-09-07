"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { PrintButton } from "@/components/PrintButton";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { ResourceKind, Skill } from "@/lib/types";

const kindLabels: Record<ResourceKind, string> = {
  worksheet: "ورقة عمل",
  skills_practice: "تدريب مهارات",
  midterm: "اختبار نصفي",
  final: "اختبار نهائي",
};

function promptForSkill(skill: Skill, index: number) {
  if (skill.subjectId === "quran") {
    if (skill.category.includes("حفظ")) return `${index + 1}) سمّع للمعلم/ولي الأمر: ${skill.title.replace(/^يحفظ\s*/, "")}.`;
    return `${index + 1}) اقرأ المقطع المقرر قراءة واضحة، ثم ضع علامة ✓ بعد إكماله: ${skill.title}.`;
  }
  if (skill.subjectId === "lughati") {
    if (skill.category.includes("القراءة")) return `${index + 1}) اقرأ الجزء المرتبط بهذه المهارة بصوت واضح: ${skill.title}.`;
    if (skill.category.includes("الفهم")) return `${index + 1}) بعد القراءة، اذكر معنى أو فكرة رئيسة مرتبطة بالمهارة: ${skill.title}.`;
    if (skill.category.includes("الإملاء") || skill.category.includes("الكتابة")) return `${index + 1}) نفّذ تدريب كتابة/إملاء قصير يحقق المهارة: ${skill.title}.`;
    return `${index + 1}) طبّق المهارة التالية في مثال من عندك: ${skill.title}.`;
  }
  return `${index + 1}) أجب أو طبّق ما تعلمته في المهارة التالية: ${skill.title}.`;
}

function guideForSkill(skill: Skill) {
  if (skill.subjectId === "quran") return "التصحيح وفق صحة الحفظ/التلاوة ومستوى الاستقلالية.";
  if (skill.subjectId === "lughati") return `يُقبل الأداء الذي يحقق معيار: ${skill.category}.`;
  return "يُصحح وفق فهم المفهوم وتطبيقه بصورة صحيحة ومناسبة لعمر الطالب.";
}

function downloadHtml(title: string, instructions: string, items: string[]) {
  const body = items.map((item) => `<li style="margin:14px 0;line-height:1.9">${item}</li>`).join("");
  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${title}</title><body style="font-family:Tahoma,Arial,sans-serif;max-width:800px;margin:40px auto;padding:24px"><h1>${title}</h1><p>${instructions}</p><hr><ol>${body}</ol><div style="margin-top:40px;border-top:1px solid #ddd;padding-top:12px;font-size:12px;color:#666">برمجة سلطان الصاعدي</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[\\/:*?"<>|]/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResourceGeneratorPage() {
  const store = useTaallamt();
  const activeTerm = store.terms.find((term) => term.active) ?? store.terms[0];
  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === activeTerm?.id).sort((a, b) => a.order - b.order);
  const activeStudents = store.students.filter((student) => student.active);
  const [kind, setKind] = useState<ResourceKind>("worksheet");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "quran");
  const [week, setWeek] = useState(academicWeek());
  const [count, setCount] = useState(6);
  const [audience, setAudience] = useState("all");
  const [generated, setGenerated] = useState<{ title: string; instructions: string; items: string[]; answerGuide: string[] } | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  const skillPool = useMemo(() => {
    const subjectSkills = store.skills.filter((skill) => skill.active && skill.termId === activeTerm?.id && skill.subjectId === subjectId);
    if (kind === "midterm") return subjectSkills.filter((skill) => skill.week <= 8);
    if (kind === "final") return subjectSkills;
    return subjectSkills.filter((skill) => skill.week === week);
  }, [store.skills, activeTerm?.id, subjectId, kind, week]);

  function generate() {
    const subject = subjects.find((item) => item.id === subjectId);
    const chosen = skillPool.length ? Array.from({ length: Math.min(count, Math.max(count, skillPool.length)) }, (_, index) => skillPool[index % skillPool.length]).slice(0, count) : [];
    const title = `${kindLabels[kind]} — ${subject?.name ?? "المادة"}${kind === "worksheet" || kind === "skills_practice" ? ` — الأسبوع ${week}` : ""}`;
    const instructions = kind === "midterm" || kind === "final"
      ? "أجب عن جميع البنود. يراعى أن تكون الأسئلة قصيرة وواضحة ومناسبة لطلاب الصف الثاني الابتدائي."
      : "نفّذ البنود بهدوء. الهدف هو التدريب على المهارات المستهدفة وليس الإطالة في الواجب.";
    const items = chosen.map((skill, index) => promptForSkill(skill, index));
    const answerGuide = chosen.map(guideForSkill);
    setGenerated({ title, instructions, items, answerGuide });
    setSavedMessage("");
  }

  function saveAndPublish(publish: boolean) {
    if (!generated) return;
    const audienceStudentIds = audience === "all" ? activeStudents.map((student) => student.id) : [audience];
    store.addLearningResource({
      subjectId,
      kind,
      title: generated.title,
      week: kind === "worksheet" || kind === "skills_practice" ? week : undefined,
      instructions: generated.instructions,
      items: generated.items,
      answerGuide: generated.answerGuide,
      audienceStudentIds,
      publishedToGuardian: publish,
    });
    if (publish) {
      audienceStudentIds.forEach((studentId) => store.sendMessage(studentId, "teacher", `تم إرسال ${generated.title}. افتح قسم الأوراق والاختبارات في صفحة ولي الأمر.`));
      setSavedMessage("تم الحفظ والإرسال إلى صفحة ولي الأمر للمستهدفين.");
    } else {
      setSavedMessage("تم حفظ النسخة داخل تعلّمت بدون إرسالها لولي الأمر.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar no-print">
        <div className="brand"><div className="logo">📝</div><div><h1>توليد أوراق العمل والاختبارات</h1><p>من المهارات والتوزيع المسجل في تعلّمت</p></div></div>
        <Link className="btn secondary" href="/">لوحة المعلم</Link>
      </header>
      <div className="no-print"><DateBar /></div>

      <section className="hero section no-print">
        <div><h2>ورقة جاهزة خلال ثوانٍ</h2><p>اختر المادة ونوع الورقة، وسيبني النظام نسخة أولية من مهارات المنهج. تستطيع طباعتها، حفظها، أو إرسالها لولي الأمر.</p></div>
        <div className="hero-stats"><div className="stat"><b>4</b><span>أنواع</span></div><div className="stat"><b>{skillPool.length}</b><span>مهارات متاحة</span></div><div className="stat"><b>PDF</b><span>عبر الطباعة</span></div><div className="stat"><b>ولي الأمر</b><span>إرسال مباشر داخل النظام</span></div></div>
      </section>

      <section className="section no-print">
        <div className="card stack">
          <div className="toolbar">
            <label>النوع</label>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
              <option value="worksheet">ورقة عمل</option><option value="skills_practice">تدريب مهارات</option><option value="midterm">اختبار نصفي</option><option value="final">اختبار نهائي</option>
            </select>
            <label>المادة</label>
            <select className="field" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
            {(kind === "worksheet" || kind === "skills_practice") && <><label>الأسبوع</label><select className="field" value={week} onChange={(e) => setWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>الأسبوع {item}</option>)}</select></>}
          </div>
          <div className="toolbar">
            <label>عدد البنود</label>
            <select className="field" value={count} onChange={(e) => setCount(Number(e.target.value))}>{[4,6,8,10,12].map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <label>المستهدف</label>
            <select className="field grow" value={audience} onChange={(e) => setAudience(e.target.value)}><option value="all">الفصل كامل</option>{activeStudents.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select>
            <button className="btn" type="button" onClick={generate}>توليد الآن</button>
          </div>
          <small>النسخة الحالية تولّد بنودًا من المهارات المسجلة؛ لاحقًا يمكن إضافة توليد ذكي أعمق عبر الذكاء الاصطناعي مع بقاء مراجعة المعلم قبل الإرسال.</small>
        </div>
      </section>

      {generated && (
        <>
          <section className="section no-print">
            <div className="toolbar">
              <PrintButton label="طباعة / حفظ PDF" />
              <button className="btn secondary" type="button" onClick={() => downloadHtml(generated.title, generated.instructions, generated.items)}>تحميل نسخة</button>
              <button className="btn secondary" type="button" onClick={() => saveAndPublish(false)}>حفظ فقط</button>
              <button className="btn green" type="button" onClick={() => saveAndPublish(true)}>إرسال لولي الأمر</button>
            </div>
            {savedMessage && <div className="notice section">{savedMessage}</div>}
          </section>

          <section className="resource-paper section">
            <div className="resource-head"><div><h1>{generated.title}</h1><p>الصف الثاني الابتدائي — {activeTerm?.name} — {activeTerm?.academicYear}</p></div><div className="resource-meta"><span>اسم الطالب: ____________________</span><span>التاريخ: ____ / ____ / ______</span></div></div>
            <p className="resource-instructions">{generated.instructions}</p>
            <ol className="resource-items">{generated.items.map((item, index) => <li key={index}>{item.replace(/^\d+\)\s*/, "")}</li>)}</ol>
            <div className="resource-footer">مع تمنياتنا بالتوفيق · برمجة سلطان الصاعدي</div>
          </section>

          <section className="section no-print">
            <details className="card"><summary><b>دليل التصحيح للمعلم</b></summary><ol>{generated.answerGuide.map((item, index) => <li key={index} style={{ margin: "10px 0" }}>{item}</li>)}</ol></details>
          </section>
        </>
      )}
    </main>
  );
}
