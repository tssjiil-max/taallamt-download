"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { GuardianResources } from "@/components/GuardianResources";
import { GuardianSkillProgress } from "@/components/GuardianSkillProgress";
import { GuardianSpellingPractice } from "@/components/GuardianSpellingPractice";
import { GuardianValues } from "@/components/GuardianValues";
import { NotificationPanel } from "@/components/NotificationPanel";
import { PrintButton } from "@/components/PrintButton";
import { remedialAction, skillsNeedingTraining } from "@/lib/assessment";
import { academicWeek, plansForWeek, tomorrowAnnouncement } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";
import type { FollowUpCategory, MasteryLevel } from "@/lib/types";

const labels: Record<MasteryLevel, string> = { mastered: "متقن", partial: "أتقن البعض", needs_training: "يحتاج تدريب" };
const progressLabels = { improving: "يتحسن", stable: "مستقر", needs_review: "يحتاج مراجعة" } as const;
const SESSION_KEY = "taallamt-guardian-session";

export default function GuardianPage() {
  const store = useTaallamt();
  const active = store.students.filter((student) => student.active);
  const [sessionStudentId, setSessionStudentId] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [category, setCategory] = useState<FollowUpCategory>("learning");
  const [statement, setStatement] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) setSessionStudentId(saved);
    setSessionReady(true);
  }, []);

  const student = active.find((item) => item.id === sessionStudentId);
  const matches = useMemo(() => {
    const q = search.trim();
    if (q.length < 2) return [];
    return active.filter((item) => item.name.includes(q)).slice(0, 8);
  }, [active, search]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    const target = active.find((item) => item.id === selectedId);
    if (!target) { setLoginError("اختر اسم الطالب أولًا."); return; }
    if (!target.guardianAccessEnabled) { setLoginError("وصول ولي الأمر لهذا الطالب غير مفعّل بعد. تواصل مع المعلم."); return; }
    const ok = await store.verifyGuardianAccess(target.id, code);
    if (!ok) { setLoginError("رمز الوصول غير صحيح."); return; }
    if (target.guardianDevices >= target.guardianDeviceLimit) { setLoginError("تم الوصول للحد المسموح من الأجهزة. اطلب من المعلم إلغاء أحد الأجهزة."); return; }
    store.setGuardianDevices(target.id, target.guardianDevices + 1);
    localStorage.setItem(SESSION_KEY, target.id);
    setSessionStudentId(target.id);
    setCode("");
  }

  function logout() {
    if (student) store.setGuardianDevices(student.id, Math.max(0, student.guardianDevices - 1));
    localStorage.removeItem(SESSION_KEY);
    setSessionStudentId("");
    setSelectedId("");
    setSearch("");
  }

  if (!store.ready || !sessionReady) return <main className="shell"><div className="notice">جاري فتح بوابة ولي الأمر…</div></main>;

  if (!student) {
    return (
      <main className="shell">
        <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — تعلّمت</p></div></div></header>
        <DateBar />
        <section className="hero section"><div><h2>دخول ولي الأمر</h2><p>ابحث عن اسم الطالب ثم أدخل رمز الوصول المكوّن من 6 أرقام الذي استلمته من المعلم.</p></div><div className="hero-stats"><div className="stat"><b>6</b><span>أرقام</span></div><div className="stat"><b>2</b><span>أقصى أجهزة</span></div><div className="stat"><b>🔒</b><span>خاص بابنك</span></div><div className="stat"><b>بدون حساب</b><span>لا بريد ولا جوال</span></div></div></section>
        <section className="section"><form className="card stack" onSubmit={login}>
          <label className="stack">ابحث عن اسم الطالب<input className="field" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedId(""); }} placeholder="اكتب أول حرفين أو أكثر من الاسم" /></label>
          {matches.length > 0 && <div className="list">{matches.map((item) => <button className={`row guardian-pick ${selectedId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><div className="row-main"><div className="avatar">🧒</div><div><h4>{item.name}</h4><small>{item.className}</small></div></div><span className="badge">{selectedId === item.id ? "محدد" : "اختيار"}</span></button>)}</div>}
          {selectedId && <label className="stack">رمز الوصول<input className="field guardian-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>}
          {loginError && <div className="notice warn">{loginError}</div>}
          <button className="btn" type="submit" disabled={!selectedId || code.length !== 6}>دخول</button>
          <small>في النسخة الإنتاجية يتم التحقق في الخادم ولا يظهر رمز الوصول أو قائمة الطلاب كاملة للمتصفح.</small>
        </form></section>
        <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      </main>
    );
  }

  const studentId = student.id;
  const subjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId).sort((a, b) => a.order - b.order);
  const activeSkills = store.skills.filter((skill) => skill.active && skill.termId === store.activeTermId);
  const needsSkills = skillsNeedingTraining(activeSkills, store.assessments, studentId, store.activeTermId);
  const followUp = store.followUps[studentId];
  const messages = store.messages.filter((item) => item.studentId === studentId);
  const week = academicWeek();
  const weekly = plansForWeek(store.weeklyPlans, week);
  const tomorrow = tomorrowAnnouncement(store.weeklyPlans, store.subjects);
  const sentResources = store.resources.filter((resource) => resource.publishedToGuardian && resource.audienceStudentIds.includes(studentId)).length;
  const stars = store.valueStars.filter((star) => star.studentId === studentId).length;

  function send(event: FormEvent) {
    event.preventDefault();
    store.sendMessage(studentId, "guardian", message);
    setMessage("");
  }

  function submitStatement(event: FormEvent) {
    event.preventDefault();
    store.saveGuardianStatement(studentId, category, statement);
    setStatement("");
    alert("تم إرسال الملاحظة للمعلم وإضافتها إلى ملف المتابعة الخاصة");
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — خطة، مستوى، مهام وتواصل</p></div></div><div className="mini-actions no-print"><span className="pill">الأجهزة {student.guardianDevices}/{student.guardianDeviceLimit}</span><button className="btn secondary" type="button" onClick={logout}>خروج</button></div></header>
      <DateBar />

      <section className="hero section"><div><h2>{student.name}</h2><p>هذه الصفحة تخص ابنك فقط: خطة الأسبوع، ماذا لديه غدًا، المهارات التي تحتاج تدريبًا، القيم، والإرسال المباشر من المعلم.</p></div><div className="hero-stats"><div className="stat"><b>{week}</b><span>الأسبوع الحالي</span></div><div className="stat"><b>{sentResources}</b><span>أوراق واختبارات</span></div><div className="stat"><b>{stars}</b><span>نجوم قيم</span></div><div className="stat"><b>{needsSkills.length}</b><span>مهارات تحتاج تدريبًا</span></div></div></section>

      <NotificationPanel role="guardian" studentId={studentId} />

      <section className="section"><div className="section-head"><h2>📌 ماذا لدينا غدًا؟</h2><span className="pill">{tomorrow.tomorrow}</span></div><div className="card">{tomorrow.items.length ? <ul>{tomorrow.items.map((item) => <li key={item} style={{ marginBottom: 9 }}>{item}</li>)}</ul> : <div className="notice">لا يوجد تفصيل يومي محفوظ للغد بعد.</div>}{tomorrow.weeklyOnly.length > 0 && <><h3 className="section">مواد هذا الأسبوع</h3><ul>{tomorrow.weeklyOnly.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul></>}</div></section>

      <section className="section"><div className="section-head"><h2>خطة الأسبوع {week}</h2><span className="pill">تُنشر من السبت</span></div><div className="grid">{weekly.map((plan) => { const subject = subjects.find((item) => item.id === plan.subjectId); return <div className="card" key={plan.id}><div className="icon">📘</div><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></div>; })}</div></section>

      <GuardianSpellingPractice />
      <GuardianValues studentId={studentId} />
      <GuardianResources studentId={studentId} />
      <GuardianSkillProgress studentId={studentId} />

      <section className="section"><div className="section-head"><h2>المستوى العام للمواد</h2></div><div className="grid">{subjects.map((subject) => { const level = student.subjectLevels[subject.id]; return <div className="card" key={subject.id}><div className="icon">📚</div><h3>{subject.name}</h3>{level ? <span className={`badge ${level === "needs_training" ? "warn" : ""}`}>{labels[level]}</span> : <span className="badge">لم يقيّم بعد</span>}</div>; })}</div></section>

      <section className="section"><div className="section-head"><h2>الخطة العلاجية من آخر تقييم</h2><PrintButton label="طباعة الخطة" /></div><div className="card">{needsSkills.length ? <div className="list">{needsSkills.map((skill) => { const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small><b>{skill.title}</b><br />في المنزل: {remedialAction(skill)}</small></div><span className="badge warn">يحتاج تدريب</span></div>; })}</div> : <div className="notice">لا توجد حاليًا مهارة مصنفة «يحتاج تدريب» في آخر تقييم مسجل. استمروا على خطة الأسبوع فقط.</div>}</div></section>

      {followUp?.guardianVisible && <section className="section"><div className="section-head"><h2>المتابعة المشتركة مع المدرسة</h2><span className={`badge ${followUp.status === "needs_review" ? "warn" : ""}`}>{progressLabels[followUp.status]}</span></div><div className="card">{followUp.goal && <div className="kv"><span>الهدف</span><span>{followUp.goal}</span></div>}<div className="kv"><span>المراجعة</span><span>{followUp.nextReviewAt || "حسب متابعة المعلم"}</span></div>{followUp.plan.length > 0 && <><h3 className="section">ما نعمل عليه</h3><ul>{followUp.plan.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul></>}<div className="notice warn">المتابعة الصحية هنا تعليمية ومدرسية وليست تشخيصًا أو علاجًا طبيًا.</div></div></section>}

      <section className="section no-print"><div className="section-head"><h2>حالة أو ملاحظة مهمة</h2></div><form className="card stack" onSubmit={submitStatement}><p>أرسل للمعلم معلومة تؤثر على تعلم الطالب ليضع لها متابعة مناسبة.</p><select className="field" value={category} onChange={(e) => setCategory(e.target.value as FollowUpCategory)}><option value="health">حالة صحية مؤثرة</option><option value="learning">صعوبة أو ضعف تعليمي</option><option value="behavior">متابعة سلوكية</option><option value="family">ظرف أسري مؤثر</option><option value="other">أخرى</option></select><textarea className="field textarea" required value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="اكتب ما يحتاج المعلم معرفته..." /><button className="btn" type="submit">إرسال للمعلم</button></form>{followUp?.guardianStatement && <div className="notice warn section"><b>آخر معلومة محفوظة:</b> {followUp.guardianStatement}</div>}</section>

      <section className="section no-print"><div className="section-head"><h2>التواصل مع المعلم</h2></div><div className="card"><div className="list">{messages.slice(-8).map((item) => <div className="row" key={item.id}><div><h4>{item.author === "guardian" ? "ولي الأمر" : "المعلم"}</h4><small>{item.body}</small></div></div>)}{messages.length === 0 && <div className="notice">لا توجد رسائل بعد.</div>}</div><form className="toolbar section" onSubmit={send}><input className="field grow" required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالة قصيرة للمعلم" /><button className="btn" type="submit">إرسال</button></form></div></section>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
