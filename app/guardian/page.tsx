"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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

const subjectOrder = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية"];
const subjectIcon = (name: string) => name.includes("لغتي") ? "✏️" : name.includes("قرآن") ? "📖" : "🕌";

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

type UpdateItem = { id: string; title: string; detail: string; at: string; icon: string };

function loginMessage(error: unknown) {
  const payload = (error as { payload?: { error?: string } })?.payload;
  if (payload?.error === "INVALID_CODE") return "رمز الوصول غير صحيح.";
  if (payload?.error === "ACCESS_DISABLED") return "وصول ولي الأمر لهذا الطالب غير مفعّل بعد. تواصل مع المعلم.";
  if (payload?.error === "DEVICE_LIMIT") return "تم الوصول للحد المسموح من الأجهزة. اطلب من المعلم إلغاء أحد الأجهزة.";
  if (payload?.error === "TOO_MANY_ATTEMPTS") return "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.";
  return "تعذر تسجيل الدخول الآن. أعد المحاولة بعد قليل.";
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date);
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
      .then((next) => { if (!cancelled) setBundle(next); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setSessionReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (bundle || q.length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      guardianSearch(q).then((result) => setMatches(result.students)).catch(() => setMatches([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, bundle]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    if (!selectedId) { setLoginError("اختر اسم الطالب أولًا."); return; }
    if (!/^\d{6}$/.test(code)) { setLoginError("أدخل رمز الوصول المكوّن من 6 أرقام."); return; }
    setBusy(true);
    try {
      await guardianLogin(selectedId, code);
      await refreshBundle();
      setCode(""); setSearch(""); setSelectedId(""); setMatches([]);
    } catch (error) {
      setLoginError(loginMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try { await guardianLogout(); } catch {}
    setBundle(null); setSelectedId(""); setSearch(""); setMatches([]); setNotice(""); setBusy(false);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true); setNotice("");
    try {
      await guardianSendMessage(message.trim());
      setMessage("");
      await refreshBundle();
      setNotice("تم إرسال الرسالة للمعلم.");
    } catch {
      setNotice("تعذر إرسال الرسالة الآن.");
    } finally { setBusy(false); }
  }

  async function submitStatement(event: FormEvent) {
    event.preventDefault();
    if (!statement.trim()) return;
    setBusy(true); setNotice("");
    try {
      await guardianSendFollowUp(category, statement.trim());
      setStatement("");
      await refreshBundle();
      setNotice("تم إرسال الملاحظة للمعلم وإضافتها إلى المتابعة.");
    } catch {
      setNotice("تعذر إرسال الملاحظة الآن.");
    } finally { setBusy(false); }
  }

  if (!sessionReady) return <main className="shell"><div className="empty-state"><span>🌱</span><b>جاري فتح بوابة ولي الأمر…</b></div></main>;

  if (!bundle) {
    return (
      <main className="shell guardian-shell">
        <header className="guardian-login-header">
          <div className="teacher-brand-block"><div className="brand-mark">ت</div><div><h1>تعلّمت</h1><p>متابعة ولي الأمر</p></div></div>
          <div className="guardian-characters"><span className="child-character" aria-hidden="true">🧒</span><img src="/shakabumbo.jpg" alt="شكابمبو" /></div>
        </header>
        <DateBar />
        <section className="ui-section first-ui-section">
          <div className="section-title-row"><div><h2>دخول ولي الأمر</h2><p>ابحث عن الطالب ثم استخدم رمز الوصول الذي استلمته من المعلم.</p></div></div>
          <form className="card stack guardian-login-card" onSubmit={login}>
            <label className="stack">اسم الطالب<input className="field" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(""); setLoginError(""); }} placeholder="اكتب أول حرفين أو أكثر" /></label>
            {search.trim().length >= 2 && matches.length === 0 && <div className="notice">لا يظهر إلا الطلاب الذين فعّل المعلم وصول ولي الأمر لهم.</div>}
            {matches.length > 0 && <div className="list">{matches.map((item) => <button className={`row guardian-pick ${selectedId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => { setSelectedId(item.id); setLoginError(""); }}><div className="row-main"><div className="avatar">🧒</div><div><h4>{item.name}</h4><small>{item.className}</small></div></div><span className="badge">{selectedId === item.id ? "محدد" : "اختيار"}</span></button>)}</div>}
            {selectedId && <label className="stack">رمز الوصول<input className="field guardian-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>}
            {loginError && <div className="notice warn">{loginError}</div>}
            <button className="btn" type="submit" disabled={busy || !selectedId || code.length !== 6}>{busy ? "جاري التحقق…" : "دخول"}</button>
          </form>
        </section>
        <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      </main>
    );
  }

  const student = bundle.student;
  const studentId = student.id;
  const subjects = bundle.subjects
    .filter((subject) => subject.enabled !== false && subjectOrder.includes(subject.name))
    .sort((a, b) => subjectOrder.indexOf(a.name) - subjectOrder.indexOf(b.name));
  const activeTermId = bundle.activeTerm?.id ?? "";
  const activeSkills = bundle.skills.filter((skill) => skill.active !== false);
  const needsSkills = activeTermId ? skillsNeedingTraining(activeSkills, bundle.assessments, studentId, activeTermId) : [];
  const followUp = bundle.followUp;
  const messages = bundle.messages;
  const teacherMessages = messages.filter((item) => item.author === "teacher");
  const week = academicWeek();
  const weekly = plansForWeek(bundle.weeklyPlans, week);
  const tomorrow = tomorrowAnnouncement(bundle.weeklyPlans, subjects);
  const stars = bundle.valueStars.length;
  const currentValues = bundle.values.filter((value) => value.active && week >= value.weekFrom && week <= value.weekTo);
  const spelling = bundle.spellingPractices.find((item) => item.active && item.week === week);
  const currentSkills = activeSkills.filter((skill) => skill.week === week);
  const latestAssessment = new Map<string, SkillAssessment>();
  for (const assessment of bundle.assessments) {
    const current = latestAssessment.get(assessment.skillId);
    if (!current || assessment.assessedAt > current.assessedAt) latestAssessment.set(assessment.skillId, assessment);
  }

  const currentLevels = currentSkills.map((skill) => latestAssessment.get(skill.id)?.level).filter((level): level is MasteryLevel => Boolean(level));
  const storedLevels = Object.values(student.subjectLevels);
  const levelPool = currentLevels.length ? currentLevels : storedLevels;
  const overallLevel: MasteryLevel | undefined = levelPool.includes("needs_training") ? "needs_training" : levelPool.includes("partial") ? "partial" : levelPool.includes("mastered") ? "mastered" : undefined;

  const starByValue = new Map<string, number>();
  for (const star of bundle.valueStars) starByValue.set(star.valueId, (starByValue.get(star.valueId) ?? 0) + 1);
  const awardsCount = [...starByValue.values()].filter((count) => count >= 8).length;
  const alertsCount = teacherMessages.length + bundle.resources.length + (followUp?.status === "needs_review" ? 1 : 0);

  const recentUpdates: UpdateItem[] = [
    ...bundle.assessments.map((assessment) => {
      const skill = activeSkills.find((item) => item.id === assessment.skillId);
      const subject = skill ? subjects.find((item) => item.id === skill.subjectId) : undefined;
      return { id: assessment.id, title: "تقييم جديد", detail: [subject?.name, skill?.category, labels[assessment.level]].filter(Boolean).join(" · "), at: assessment.assessedAt, icon: "✅" };
    }),
    ...teacherMessages.map((item) => ({ id: item.id, title: "رسالة من المعلم", detail: item.body, at: item.createdAt, icon: "💬" })),
    ...bundle.resources.map((resource) => ({ id: resource.id, title: "مادة جديدة في المكتبة", detail: resource.title, at: resource.createdAt, icon: "📚" })),
    ...bundle.valueStars.map((star) => ({ id: star.id, title: "تحديث السلوك", detail: bundle.values.find((value) => value.id === star.valueId)?.title ?? "نجمة سلوك إيجابي", at: star.awardedAt, icon: "⭐" })),
  ].filter((item) => item.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  return (
    <main className="shell guardian-shell">
      <header className="guardian-header">
        <div className="guardian-student-copy">
          <div className="teacher-brand-block"><div className="brand-mark">ت</div><div><h1>تعلّمت</h1><p>متابعة ولي الأمر</p></div></div>
          <div className="student-name-block"><h2>{student.name}</h2><span>{student.className}</span></div>
        </div>
        <div className="guardian-characters">
          <span className="child-character" aria-label="الطالب">🧒</span>
          <a className="guardian-shak-link" href="https://chatgpt.com/" target="_blank" rel="noreferrer" aria-label="اسأل شكابمبو"><img src="/shakabumbo.jpg" alt="شكابمبو" /><small>اسأل شكابمبو</small></a>
        </div>
        <button className="logout-mini no-print" disabled={busy} type="button" onClick={() => void logout()}>خروج</button>
      </header>
      <DateBar />

      {notice && <div className="notice section">{notice}</div>}

      <section className="ui-section first-ui-section">
        <div className="section-title-row"><div><h2>ملخص الطالب</h2><p>مؤشرات فعلية من سجله</p></div></div>
        <div className="square-grid indicator-grid">
          <article className="square-card indicator-card"><div className="square-icon green">🌟</div><b>{stars}</b><span>السلوك</span></article>
          <article className="square-card indicator-card"><div className="square-icon orange">🎯</div><b className="text-value">{overallLevel ? labels[overallLevel] : "—"}</b><span>المستوى الحالي</span></article>
          <article className="square-card indicator-card"><div className="square-icon green">🏆</div><b>{awardsCount}</b><span>الجوائز</span></article>
          <Link className="square-card indicator-card" href="/guardian/announcements"><div className="square-icon orange">🔔</div><b>{alertsCount}</b><span>التنبيهات</span></Link>
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>مواد الطالب</h2><p>المواد الرئيسية فقط</p></div></div>
        <div className="square-grid subject-card-grid">
          {subjects.map((subject, index) => {
            const level = student.subjectLevels[subject.id];
            return <article className="square-card subject-square-card" key={subject.id}><div className={`square-icon ${index % 2 === 0 ? "green" : "orange"}`}>{subjectIcon(subject.name)}</div><h3>{subject.name}</h3><p>{level ? labels[level] : "لم يقيّم بعد"}</p></article>;
          })}
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>الخدمات</h2><p>ما يحتاجه ولي الأمر لمتابعة ابنه</p></div></div>
        <div className="square-grid guardian-services-grid">
          <a className="square-card quick-card" href="#class-tasks"><div className="square-icon green">📝</div><h3>المهام الصفية</h3><p>ما يعمل عليه الطالب داخل الفصل</p></a>
          <a className="square-card quick-card" href="#remedial-plan"><div className="square-icon orange">🧩</div><h3>الخطة العلاجية</h3><p>{needsSkills.length ? `${needsSkills.length} مهارة تحتاج تدريبًا` : "لا توجد مهارات معلقة"}</p></a>
          <a className="square-card quick-card" href="#student-report"><div className="square-icon orange">📊</div><h3>التقارير</h3><p>مستوى المواد والمهارات</p></a>
          <a className="square-card quick-card" href="#guardian-message"><div className="square-icon green">💬</div><h3>رسالة المعلم</h3><p>{teacherMessages.length ? `${teacherMessages.length} رسالة` : "لا توجد رسائل"}</p></a>
          <a className="square-card quick-card" href="#library"><div className="square-icon green">📚</div><h3>المكتبة</h3><p>{bundle.resources.length ? `${bundle.resources.length} مادة منشورة` : "لا توجد ملفات منشورة"}</p></a>
        </div>
      </section>

      <section className="ui-section">
        <div className="section-title-row"><div><h2>آخر التحديثات</h2><p>تحديثات ابنك فقط</p></div></div>
        {recentUpdates.length ? <div className="activity-grid">{recentUpdates.map((item) => <article className="activity-card" key={`${item.id}-${item.at}`}><div className="activity-icon">{item.icon}</div><div><h3>{item.title}</h3><p>{item.detail}</p><small>{shortDate(item.at)}</small></div></article>)}</div> : <div className="empty-state"><span>🌱</span><b>لا توجد تحديثات حديثة</b><p>ستظهر هنا التقييمات والرسائل والسلوك والمواد عند تحديثها.</p></div>}
      </section>

      <section className="ui-section detail-section" id="class-tasks">
        <div className="section-title-row"><div><h2>المهام الصفية والأسبوع الحالي</h2><p>متابعة ما يعمل عليه الطالب داخل الفصل، بدون رفع واجبات من المنزل.</p></div><span className="soft-chip">الأسبوع {week}</span></div>
        <div className="card compact-detail-card"><h3>ماذا لدينا غدًا؟ — {tomorrow.tomorrow}</h3>{tomorrow.items.length ? <ul>{tomorrow.items.map((item) => <li key={item}>{item}</li>)}</ul> : <div className="empty-inline">لا يوجد تفصيل يومي محفوظ للغد.</div>}</div>
        <div className="square-grid subject-card-grid section">{weekly.map((plan) => { const subject = subjects.find((item) => item.id === plan.subjectId); return <article className="square-card subject-square-card" key={plan.id}><div className="square-icon green">{subject ? subjectIcon(subject.name) : "📘"}</div><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></article>; })}{weekly.length === 0 && <div className="empty-state"><span>📝</span><b>لا توجد مهام أو خطة أسبوعية منشورة</b></div>}</div>
      </section>

      <section className="ui-section detail-section" id="library">
        <div className="section-title-row"><div><h2>المكتبة</h2><p>المواد التي نشرها المعلم لولي الأمر</p></div></div>
        {bundle.resources.length ? <div className="square-grid library-grid">{bundle.resources.map((resource) => <Link className="square-card library-card" href={`/guardian/resources/${resource.id}`} key={resource.id}><div className="square-icon orange">📄</div><h3>{resource.title}</h3><p>{subjects.find((subject) => subject.id === resource.subjectId)?.name ?? "مادة تعليمية"}</p><span className="open-label">فتح</span></Link>)}</div> : <div className="empty-state"><span>📚</span><b>لا توجد ملفات منشورة حاليًا</b></div>}
      </section>

      <section className="ui-section detail-section" id="student-report">
        <div className="section-title-row"><div><h2>التقرير الدراسي</h2><p>المستوى والمهارات من التقييمات المسجلة</p></div></div>
        <div className="square-grid subject-card-grid">{subjects.map((subject) => { const level = student.subjectLevels[subject.id]; return <article className="square-card subject-square-card" key={subject.id}><div className="square-icon orange">{subjectIcon(subject.name)}</div><h3>{subject.name}</h3><p>{level ? labels[level] : "لم يقيّم بعد"}</p></article>; })}</div>
        <div className="list section">{currentSkills.map((skill) => { const assessment = latestAssessment.get(skill.id); const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small>{skill.title}</small></div><span className={`badge ${assessment?.level === "needs_training" ? "warn" : ""}`}>{assessment ? labels[assessment.level] : "لم يقيّم"}</span></div>; })}{currentSkills.length === 0 && <div className="empty-inline">لا توجد مهارات محددة لهذا الأسبوع.</div>}</div>
      </section>

      <section className="ui-section detail-section" id="remedial-plan">
        <div className="section-title-row"><div><h2>الخطة العلاجية</h2><p>مبنية على آخر تقييم مسجل</p></div><PrintButton label="طباعة الخطة" /></div>
        {needsSkills.length ? <div className="list">{needsSkills.map((skill) => { const subject = subjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small><b>{skill.title}</b><br />في المنزل: {remedialAction(skill)}</small></div><span className="badge warn">يحتاج تدريب</span></div>; })}</div> : <div className="empty-state"><span>🌱</span><b>لا توجد مهارة مصنفة «يحتاج تدريب» حاليًا</b></div>}
      </section>

      <section className="ui-section detail-section no-print" id="guardian-message">
        <div className="section-title-row"><div><h2>رسالة المعلم</h2><p>التواصل الحالي المرتبط بالطالب</p></div></div>
        <div className="card"><div className="list">{messages.slice(-8).map((item) => <div className="row" key={item.id}><div><h4>{item.author === "guardian" ? "ولي الأمر" : "المعلم"}</h4><small>{item.body}</small></div></div>)}{messages.length === 0 && <div className="empty-inline">لا توجد رسائل بعد.</div>}</div><form className="toolbar section" onSubmit={send}><input className="field grow" required value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالة قصيرة للمعلم" /><button className="btn" disabled={busy} type="submit">إرسال</button></form></div>
      </section>

      <details className="utility-panel">
        <summary>تفاصيل إضافية لهذا الأسبوع</summary>
        <div className="section">
          {spelling && <div className="card"><h3>✍️ الإملاء والخط</h3><p>{spelling.unitName} — {spelling.skill}</p></div>}
          <div className="square-grid library-grid section">{currentValues.map((value) => { const valueStars = bundle.valueStars.filter((star) => star.valueId === value.id).length; return <article className="square-card library-card" key={value.id}><div className="square-icon green">⭐</div><h3>{value.title}</h3><p>{value.studentText}</p><span className="soft-chip">{valueStars} نجمة</span></article>; })}{currentValues.length === 0 && !spelling && <div className="empty-inline">لا توجد تفاصيل إضافية لهذا الأسبوع.</div>}</div>
        </div>
      </details>

      <details className="utility-panel no-print">
        <summary>المتابعة المشتركة والملاحظات</summary>
        <div className="section">
          {followUp?.guardianVisible && <div className="card"><div className="section-title-row"><h3>المتابعة المشتركة مع المدرسة</h3><span className={`badge ${followUp.status === "needs_review" ? "warn" : ""}`}>{progressLabels[followUp.status]}</span></div>{followUp.goal && <div className="kv"><span>الهدف</span><span>{followUp.goal}</span></div>}<div className="kv"><span>المراجعة</span><span>{followUp.nextReviewAt || "حسب متابعة المعلم"}</span></div>{followUp.plan.length > 0 && <ul>{followUp.plan.map((item) => <li key={item}>{item}</li>)}</ul>}</div>}
          <form className="card stack section" onSubmit={submitStatement}><h3>حالة أو ملاحظة مهمة</h3><select className="field" value={category} onChange={(event) => setCategory(event.target.value as FollowUpCategory)}><option value="health">حالة صحية مؤثرة</option><option value="learning">صعوبة أو ضعف تعليمي</option><option value="behavior">متابعة سلوكية</option><option value="family">ظرف أسري مؤثر</option><option value="other">أخرى</option></select><textarea className="field textarea" required value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="اكتب ما يحتاج المعلم معرفته..." /><button className="btn" disabled={busy} type="submit">إرسال للمعلم</button></form>
        </div>
      </details>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>

      <nav className="bottom-nav guardian-bottom-nav" aria-label="التنقل الرئيسي">
        <Link className="bottom-nav-item active" href="/guardian"><span>⌂</span><b>الرئيسية</b></Link>
        <a className="bottom-nav-item" href="#library"><span>📚</span><b>المكتبة</b></a>
        <Link className="bottom-nav-item" href="/guardian/announcements"><span>📢</span><b>الإعلانات</b></Link>
      </nav>
    </main>
  );
}
