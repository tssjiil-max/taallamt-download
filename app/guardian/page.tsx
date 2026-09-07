"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { GuardianResources } from "@/components/GuardianResources";
import { GuardianSkillProgress } from "@/components/GuardianSkillProgress";
import { NotificationPanel } from "@/components/NotificationPanel";
import { PrintButton } from "@/components/PrintButton";
import { useTaallamt } from "@/lib/store";
import { academicWeek, plansForWeek, tomorrowAnnouncement } from "@/lib/schedule";
import type { FollowUpCategory, MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = { mastered: "متقن", partial: "أتقن البعض", needs_training: "يحتاج تدريب" };
const progressLabels = { improving: "يتحسن", stable: "مستقر", needs_review: "يحتاج مراجعة" } as const;

export default function GuardianPage() {
  const store = useTaallamt();
  const active = store.students.filter((student) => student.active);
  const [previewId, setPreviewId] = useState("");
  const student = active.find((item) => item.id === previewId) ?? active[0];
  const [category, setCategory] = useState<FollowUpCategory>("learning");
  const [statement, setStatement] = useState("");
  const [message, setMessage] = useState("");
  if (!student) return <main className="shell"><div className="notice">لا يوجد طلاب حاليون.</div></main>;
  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId);
  const followUp = store.followUps[student.id];
  const messages = store.messages.filter((item) => item.studentId === student.id);
  const needsTraining = subjects.filter((subject) => student.subjectLevels[subject.id] === "needs_training");
  const week = academicWeek();
  const weekly = plansForWeek(store.weeklyPlans, week);
  const tomorrow = tomorrowAnnouncement(store.weeklyPlans, store.subjects);

  function send(event: FormEvent) { event.preventDefault(); store.sendMessage(student.id, "guardian", message); setMessage(""); }
  function submitStatement(event: FormEvent) { event.preventDefault(); store.saveGuardianStatement(student.id, category, statement); setStatement(""); alert("تم إرسال الملاحظة للمعلم وإضافتها لملف المتابعة الخاصة"); }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — متابعة وتواصل</p></div></div><span className="pill no-print">الأجهزة {student.guardianDevices}/{student.guardianDeviceLimit}</span></header>
      <DateBar />
      <NotificationPanel role="guardian" studentId={student.id} />
      <div className="card no-print section"><div className="toolbar"><span>معاينة أثناء البناء:</span><select className="field grow" value={student.id} onChange={(e) => setPreviewId(e.target.value)}>{active.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><Link className="btn secondary" href="/">لوحة المعلم</Link></div><small>في النسخة النهائية لن يختار ولي الأمر طالبًا؛ الجلسة الآمنة ستفتح ابنه فقط.</small></div>
      <section className="hero section"><div><h2>{student.name}</h2><p>المستوى والمهام والخطة العلاجية والتواصل مع المعلم في شاشة واحدة.</p></div><div className="hero-stats"><div className="stat"><b>{subjects.length}</b><span>مواد حالية</span></div><div className="stat"><b>{needsTraining.length}</b><span>تحتاج تدريبًا</span></div><div className="stat"><b>{messages.length}</b><span>رسائل</span></div><div className="stat"><b>{student.specialFollowUp ? "✓" : "—"}</b><span>متابعة خاصة</span></div></div></section>

      <section className="section"><div className="section-head"><h2>خطة هذا الأسبوع — الأسبوع {week}</h2></div><div className="grid">{weekly.map((plan) => { const subject = subjects.find((s) => s.id === plan.subjectId); return <div className="card" key={plan.id}><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></div>; })}</div></section>
      <section className="section"><div className="section-head"><h2>ماذا لدينا غدًا؟</h2><span className="pill">{tomorrow.tomorrow}</span></div><div className="card">{tomorrow.items.length ? <ul>{tomorrow.items.map((item) => <li key={item} style={{marginBottom: 8}}>{item}</li>)}</ul> : <div className="notice">لا يوجد تفصيل يومي محفوظ للغد بعد.</div>}{tomorrow.weeklyOnly.length > 0 && <><h3 className="section">تنبيه أسبوعي</h3><ul>{tomorrow.weeklyOnly.map((item) => <li key={item} style={{marginBottom: 8}}>{item}</li>)}</ul></>}</div></section>

      <GuardianResources studentId={student.id} />
      <GuardianSkillProgress studentId={student.id} />

      <section className="section"><div className="section-head"><h2>المواد</h2></div><div className="grid">{subjects.map((subject) => { const value = student.subjectLevels[subject.id] ?? "partial"; return <div className="card" key={subject.id}><div className="icon">📘</div><h3>{subject.name}</h3><span className={`badge ${value === "needs_training" ? "warn" : ""}`}>{labels[value]}</span></div>; })}</div></section>
      <section className="section"><div className="section-head"><h2>الخطة العلاجية العامة</h2><PrintButton label="طباعة الخطة العلاجية" /></div><div className="card">{needsTraining.length ? <><div className="kv"><span>نركز الآن على</span><b>{needsTraining.map((subject) => subject.name).join("، ")}</b></div><div className="kv"><span>في المدرسة</span><span>تدريب قصير ومتكرر على المهارات غير المتقنة مع تعزيز مباشر.</span></div><div className="kv"><span>في المنزل</span><span>5–7 دقائق يوميًا على المهمة المحددة، بدون إطالة أو ضغط.</span></div><div className="kv"><span>المراجعة</span><span>تحديث الخطة حسب نتيجة التقييم القادم.</span></div></> : <div className="notice">الخطة الدقيقة أعلاه تُبنى من تقييم المهارات الفعلية المسجلة لهذا الأسبوع.</div>}</div></section>

      {followUp?.guardianVisible && <section className="section"><div className="section-head"><h2>المتابعة المشتركة مع المدرسة</h2><span className={`badge ${followUp.status === "needs_review" ? "warn" : ""}`}>{progressLabels[followUp.status]}</span></div><div className="card">{followUp.goal && <div className="kv"><span>الهدف</span><span>{followUp.goal}</span></div>}<div className="kv"><span>المراجعة</span><span>{followUp.nextReviewAt || "حسب متابعة المعلم"}</span></div>{followUp.plan.length > 0 && <><h3 className="section">ما نعمل عليه في المدرسة</h3><ul>{followUp.plan.map((item) => <li key={item} style={{marginBottom: 8}}>{item}</li>)}</ul></>}<div className="notice warn">هذه متابعة تعليمية وليست تشخيصًا طبيًا.</div></div></section>}

      <section className="section no-print"><div className="section-head"><h2>حالة أو ملاحظة مهمة</h2></div><form className="card stack" onSubmit={submitStatement}><p>إذا كانت لدى الطالب حالة صحية أو صعوبة تعلم أو ظرف يؤثر على دراسته، اكتب ما يحتاج المعلم معرفته للمتابعة المدرسية.</p><select className="field" value={category} onChange={(e) => setCategory(e.target.value as FollowUpCategory)}><option value="health">حالة صحية مؤثرة</option><option value="learning">صعوبة أو ضعف تعليمي</option><option value="behavior">متابعة سلوكية</option><option value="family">ظرف أسري مؤثر</option><option value="other">أخرى</option></select><textarea className="field textarea" required value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="اكتب المعلومة التي تساعد المعلم على متابعة الطالب..." /><button className="btn" type="submit">إرسال للمعلم</button><small>لا تستخدم هذه الخانة للتشخيص الطبي. المعلم والنظام يتعاملان معها كتكييف ومتابعة تعليمية.</small></form>{followUp?.guardianStatement && <div className="notice warn section"><b>آخر معلومة محفوظة:</b> {followUp.guardianStatement}</div>}</section>
      <section className="section no-print"><div className="section-head"><h2>التواصل مع المعلم</h2></div><div className="card"><div className="list">{messages.slice(-6).map((item) => <div className="row" key={item.id}><div><h4>{item.author === "guardian" ? "ولي الأمر" : "المعلم"}</h4><small>{item.body}</small></div></div>)}{messages.length === 0 && <div className="notice">لا توجد رسائل بعد.</div>}</div><form className="toolbar section" onSubmit={send}><input className="field grow" required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالة قصيرة للمعلم" /><button className="btn" type="submit">إرسال</button></form></div></section>
      <section className="section no-print"><div className="card"><h3>تثبيت ولي الأمر على جهازين</h3><p>يمكن تفعيل الجلسة على جهاز الأب والأم في الوقت نفسه. أثناء البناء نحاكي عدد الأجهزة هنا، وفي النسخة الآمنة ستكون كل جلسة مرتبطة بالجهاز.</p><button className="btn section" disabled={student.guardianDevices >= student.guardianDeviceLimit} onClick={() => store.setGuardianDevices(student.id, student.guardianDevices + 1)}>{student.guardianDevices >= student.guardianDeviceLimit ? "تم الوصول للحد" : "محاكاة تفعيل جهاز"}</button></div></section>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
