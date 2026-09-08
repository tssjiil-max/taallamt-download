"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { PrintButton } from "@/components/PrintButton";
import { remedialAction, skillsNeedingTraining } from "@/lib/assessment";
import {
  guardianLogin,
  guardianLogout,
  guardianMe,
  guardianSearch,
  guardianSendFollowUp,
  guardianSendMessage,
  type GuardianSearchStudent,
} from "@/lib/guardian-api";
import { academicWeek, plansForWeek, tomorrowAnnouncement } from "@/lib/schedule";
import type {
  FollowUpCategory,
  LearningResource,
  MasteryLevel,
  Message,
  Skill,
  SkillAssessment,
  SpecialFollowUp,
  SpellingPractice,
  Subject,
  Term,
  ValueStar,
  ValueTarget,
  WeeklyPlan,
} from "@/lib/types";

const labels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

const progressLabels = {
  improving: "يتحسن",
  stable: "مستقر",
  needs_review: "يحتاج مراجعة",
} as const;

type GuardianStudent = {
  id: string;
  name: string;
  className: string;
  subjectLevels: Record<string, MasteryLevel>;
  specialFollowUp: boolean;
  guardianDevices: number;
  guardianDeviceLimit: number;
};

type GuardianBundle = {
  student: GuardianStudent;
  activeTerm: Term | null;
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  assessments: SkillAssessment[];
  resources: Array<Omit<LearningResource, "answerGuide">>;
  values: ValueTarget[];
  valueStars: ValueStar[];
  spellingPractices: SpellingPractice[];
  followUp: SpecialFollowUp | null;
  messages: Message[];
  session: { expiresAtMs: number };
};

function loginMessage(error: unknown) {
  const payload = (error as { payload?: { error?: string; retryAfterSeconds?: number } })?.payload;
  if (payload?.error === "INVALID_CODE") return "رمز الوصول غير صحيح.";
  if (payload?.error === "ACCESS_DISABLED") return "وصول ولي الأمر لهذا الطالب غير مفعّل بعد. تواصل مع المعلم.";
  if (payload?.error === "DEVICE_LIMIT") return "تم الوصول للحد المسموح من الأجهزة. اطلب من المعلم إلغاء أحد الأجهزة.";
  if (payload?.error === "TOO_MANY_ATTEMPTS") return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
  return "تعذر تسجيل الدخول الآن. أعد المحاولة بعد قليل.";
}

export default function GuardianPage() {
  const [bundle, setBundle] = useState<GuardianBundle | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<GuardianSearchStudent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [category, setCategory] = useState<FollowUpCategory>("learning");
  const [statement, setStatement] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refreshBundle() {
    const next = await guardianMe<GuardianBundle>();
    setBundle(next);
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    guardianMe<GuardianBundle>()
      .then((next) => {
        if (!cancelled) setBundle(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (bundle || q.length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      guardianSearch(q)
        .then((result) => setMatches(result.students))
        .catch(() => setMatches([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, bundle]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    if (!selectedId) {
      setLoginError("اختر اسم الطالب أولًا.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setLoginError("أدخل رمز الوصول المكوّن من 6 أرقام.");
      return;
    }
    setBusy(true);
    try {
      await guardianLogin(selectedId, code);
      await refreshBundle();
      setCode("");
      setSearch("");
      setSelectedId("");
      setMatches([]);
    } catch (error) {
      setLoginError(loginMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await guardianLogout();
    } catch {}
    setBundle(null);
    setSelectedId("");
    setSearch("");
    setMatches([]);
    setNotice("");
    setBusy(false);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await guardianSendMessage(message.trim());
      setMessage("");
      await refreshBundle();
      setNotice("تم إرسال الرسالة للمعلم.");
    } catch {
      setNotice("تعذر إرسال الرسالة الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function submitStatement(event: FormEvent) {
    event.preventDefault();
    if (!statement.trim()) return;
    setBusy(true);
    setNotice("");
    try {
      await guardianSendFollowUp(category, statement.trim());
      setStatement("");
      await refreshBundle();
      setNotice("تم إرسال الملاحظة للمعلم وإضافتها إلى المتابعة.");
    } catch {
      setNotice("تعذر إرسال الملاحظة الآن.");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionReady) {
    return <main className="shell"><div className="notice">جاري فتح بوابة ولي الأمر…</div></main>;
  }

  if (!bundle) {
    return (
      <main className="shell">
        <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — تعلّمت</p></div></div></header>
        <DateBar />
        <section className="hero section"><div><h2>دخول ولي الأمر</h2><p>ابحث عن اسم الطالب ثم أدخل رمز الوصول المكوّن من 6 أرقام الذي استلمته من المعلم.</p></div><div className="hero-stats"><div className="stat"><b>6</b><span>أرقام</span></div><div className="stat"><b>2</b><span>أقصى أجهزة</span></div><div className="stat"><b>🔒</b><span>خاص بابنك</span></div><div className="stat"><b>بدون حساب</b><span>لا بريد ولا جوال</span></div></div></section>
        <section className="section"><form className="card stack" onSubmit={login}>
          <label className="stack">ابحث عن اسم الطالب<input className="field" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(""); setLoginError(""); }} placeholder="اكتب أول حرفين أو أكثر من الاسم" /></label>
          {search.trim().length >= 2 && matches.length === 0 && <div className="notice">لا يظهر إلا الطلاب الذين فعّل المعلم وصول ولي الأمر لهم.</div>}
          {matches.length > 0 && <div className="list">{matches.map((item) => <button className={`row guardian-pick ${selectedId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => { setSelectedId(item.id); setLoginError(""); }}><div className="row-main"><div className="avatar">🧒</div><div><h4>{item.name}</h4><small>{item.className}</small></div></div><span className="badge">{selectedId === item.id ? "محدد" : "اختيار"}</span></button>)}</div>}
          {selectedId && <label className="stack">رمز الوصول<input className="field guardian-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>}
          {loginError && <div className="notice warn">{loginError}</div>}
          <button className="btn" type="submit" disabled={busy || !selectedId || code.length !== 6}>{busy ? "جاري التحقق…" : "دخول"}</button>
          <small>يتم البحث والتحقق من الرمز في الخادم، ولا يُرسل للمتصفح إلا الطالب الذي تم اختياره.</small>
        </form></section>
        <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      </main>
    );
  }

  const student = bundle.student;
  const studentId = student.id;
  const subjects = [...bundle.subjects].sort((a, b) => a.order - b.order);
  const activeTermId = bundle.activeTerm?.id ?? "";
  const activeSkills = bundle.skills.filter((skill) => skill.active !== false);
  const needsSkills = activeTermId ? skillsNeedingTraining(activeSkills, bundle.assessments, studentId, activeTermId) : [];
  const followUp = bundle.followUp;
  const messages = bundle.messages;
  const week = academicWeek();
  const weekly = plansForWeek(bundle.weeklyPlans, week);
  const tomorrow = tomorrowAnnouncement(bundle.weeklyPlans, subjects);
  const sentResources = bundle.resources.length;
  const stars = bundle.valueStars.length;
  const currentValues = bundle.values.filter((value) => value.active && week >= value.weekFrom && week <= value.weekTo);
  const spelling = bundle.spellingPractices.find((item) => item.active && item.week === week);
  const currentSkills = activeSkills.filter((skill) => skill.week === week);

  const latestAssessment = useMemo(() => {
    const map = new Map<string, SkillAssessment>();
    for (const assessment of bundle.assessments) {
      const current = map.get(assessment.skillId);
      if (!current || assessment.assessedAt > current.assessedAt) map.set(assessment.skillId, assessment);
    }
    return map;
  }, [bundle.assessments]);

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — خطة، مستوى، مهام وتواصل</p></div></div><div className="mini-actions no-print"><span className="pill">الأجهزة {student.guardianDevices}/{student.guardianDeviceLimit}</span><button className="btn secondary" disabled={busy} type="button" onClick={() => void logout()}>خروج</button></div></header>
      <DateBar />

      <section className="hero section"><div><h2>{student.name}</h2><p>هذه الصفحة تخص ابنك فقط، وبياناتها تُقرأ من Firestore بعد التحقق من الجلسة الآمنة.</p></div><div className="hero-stats"><div className="stat"><b>{week}</b><span>الأسبوع الحالي</span></div><div className="stat"><b>{sentResources}</b><span>أوراق واختبارات</span></div><div className="stat"><b>{stars}</b><span>نجوم قيم</span></div><div className="stat"><b>{needsSkills.length}</b><span>مهارات تحتاج تدريبًا</span></div></div></section>

      {notice && <div className="notice section">{notice}</div>}

      <section className="section"><div className="section-head"><h2>📌 ماذا لدينا غدًا؟</h2><span className="pill">{tomorrow.tomorrow}</span></div><div className="card">{tomorrow.items.length ? <ul>{tomorrow.items.map((item) => <li key={item} style={{ marginBottom: 9 }}>{item}</li>)}</ul> : <div className="notice">لا يوجد تفصيل يومي محفوظ للغد بعد.</div>}{tomorrow.weeklyOnly.length > 0 && <><h3 className="section">مواد هذا الأسبوع</h3><ul>{tomorrow.weeklyOnly.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul></>}</div></section>

      <section className="section"><div className="section-head"><h2>خطة الأسبوع {week}</h2><span className="pill">تُنشر من السبت</span></div><div className="grid">{weekly.map((plan) => { const subject = subjects.find((item) => item.id === plan.subjectId); return <div className="card" key={plan.id}><div className="icon">📘</div><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></div>; })}{weekly.length === 0 && <div className="notice">لا توجد خطة أسبوعية منشورة بعد.</div>}</div></section>

      {spelling && <section className="section"><div className="section-head"><h2>✍️ الإملاء والخط</h2></div><div className="card"><h3>{spelling.unitName}</h3><p>{spelling.skill}</p>{spelling.handwritingChecklist?.length > 0 && <ul>{spelling.handwritingChecklist.map((item) => <li key={item}>{item}</li>)}</ul>}</div></section>}

      <section className="section"><div className="section-head"><h2>🌟 القيم والسلوك الإيجابي</h2></div><div className="grid">{currentValues.map((value) => { const valueStars = bundle.valueStars.filter((star) => star.valueId === value.id).length; return <div className="card" key={value.id}><h3>{value.title}</h3><p>{value.studentText}</p><p><b>في المنزل:</b> {value.homeSuggestion}</p><span className="badge">⭐ {valueStars}</span></div>; })}{currentValues.length === 0 && <div className="notice">لا توجد قيمة محددة لهذا الأسبوع بعد.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>الأوراق والاختبارات المرسلة</h2></div><div className="list">{bundle.resources.map((resource) => <div className="row" key={resource.id}><div><h4>{resource.title}</h4><small>{subjects.find((subject) => subject.id === resource.subjectId)?.name ?? "المادة"} · {resource.instructions}</small></div></div>)}{bundle.resources.length === 0 && <div className="notice">لا توجد أوراق أو اختبارات مرسلة حاليًا.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>مهارات هذا الأسبوع</h2></div><div className="list">{currentSkills.map((skill) => { const assessment = latestAssessment.get(skill.id); const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small>{skill.title}</small></div><span className={`badge ${assessment?.level === "needs_training" ? "warn" : ""}`}>{assessment ? labels[assessment.level] : "لم يقيّم"}</span></div>; })}{currentSkills.length === 0 && <div className="notice">لا توجد مهارات محددة لهذا الأسبوع بعد.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>المستوى العام للمواد</h2></div><div className="grid">{subjects.map((subject) => { const level = student.subjectLevels[subject.id]; return <div className="card" key={subject.id}><div className="icon">📚</div><h3>{subject.name}</h3>{level ? <span className={`badge ${level === "needs_training" ? "warn" : ""}`}>{labels[level]}</span> : <span className="badge">لم يقيّم بعد</span>}</div>; })}</div></section>

      <section className="section"><div className="section-head"><h2>الخطة العلاجية من آخر تقييم</h2><PrintButton label="طباعة الخطة" /></div><div className="card">{needsSkills.length ? <div className="list">{needsSkills.map((skill) => { const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small><b>{skill.title}</b><br />في المنزل: {remedialAction(skill)}</small></div><span className="badge warn">يحتاج تدريب</span></div>; })}</div> : <div className="notice">لا توجد حاليًا مهارة مصنفة «يحتاج تدريب» في آخر تقييم مسجل.</div>}</div></section>

      {followUp?.guardianVisible && <section className="section"><div className="section-head"><h2>المتابعة المشتركة مع المدرسة</h2><span className={`badge ${followUp.status === "needs_review" ? "warn" : ""}`}>{progressLabels[followUp.status]}</span></div><div className="card">{followUp.goal && <div className="kv"><span>الهدف</span><span>{followUp.goal}</span></div>}<div className="kv"><span>المراجعة</span><span>{followUp.nextReviewAt || "حسب متابعة المعلم"}</span></div>{followUp.plan.length > 0 && <><h3 className="section">ما نعمل عليه</h3><ul>{followUp.plan.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul></>}<div className="notice warn">المتابعة الصحية هنا تعليمية ومدرسية وليست تشخيصًا أو علاجًا طبيًا.</div></div></section>}

      <section className="section no-print"><div className="section-head"><h2>حالة أو ملاحظة مهمة</h2></div><form className="card stack" onSubmit={submitStatement}><p>أرسل للمعلم معلومة تؤثر على تعلم الطالب ليضع لها متابعة مناسبة.</p><select className="field" value={category} onChange={(event) => setCategory(event.target.value as FollowUpCategory)}><option value="health">حالة صحية مؤثرة</option><option value="learning">صعوبة أو ضعف تعليمي</option><option value="behavior">متابعة سلوكية</option><option value="family">ظرف أسري مؤثر</option><option value="other">أخرى</option></select><textarea className="field textarea" required value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="اكتب ما يحتاج المعلم معرفته..." /><button className="btn" disabled={busy} type="submit">إرسال للمعلم</button></form>{followUp?.guardianStatement && <div className="notice warn section"><b>آخر معلومة محفوظة:</b> {followUp.guardianStatement}</div>}</section>

      <section className="section no-print"><div className="section-head"><h2>التواصل مع المعلم</h2></div><div className="card"><div className="list">{messages.slice(-8).map((item) => <div className="row" key={item.id}><div><h4>{item.author === "guardian" ? "ولي الأمر" : "المعلم"}</h4><small>{item.body}</small></div></div>)}{messages.length === 0 && <div className="notice">لا توجد رسائل بعد.</div>}</div><form className="toolbar section" onSubmit={send}><input className="field grow" required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالة قصيرة للمعلم" /><button className="btn" disabled={busy} type="submit">إرسال</button></form></div></section>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
