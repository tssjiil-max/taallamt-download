"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import {
  guardianBackendStatus,
  guardianLogin,
  guardianLogout,
  guardianMe,
  guardianSearch,
  guardianSendFollowUp,
  guardianSendMessage,
  type GuardianSearchStudent,
} from "@/lib/guardian-api";
import { academicWeek } from "@/lib/schedule";
import type { FollowUpCategory } from "@/lib/types";

type Loose = { id: string } & Record<string, unknown>;
type GuardianBundle = {
  student: {
    id: string;
    name: string;
    className: string;
    subjectLevels: Record<string, string>;
    specialFollowUp: boolean;
    guardianDevices: number;
    guardianDeviceLimit: number;
  };
  activeTerm: Loose | null;
  subjects: Loose[];
  weeklyPlans: Loose[];
  skills: Loose[];
  assessments: Loose[];
  resources: Loose[];
  values: Loose[];
  valueStars: Loose[];
  spellingPractices: Loose[];
  followUp: Loose | null;
  messages: Loose[];
  session: { expiresAtMs: number };
};

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function errorCode(error: unknown) {
  if (typeof error !== "object" || !error) return "";
  const payload = (error as { payload?: { error?: unknown } }).payload;
  return typeof payload?.error === "string" ? payload.error : "";
}

export default function SecureGuardianPilotPage() {
  const [backendReady, setBackendReady] = useState<boolean | null>(null);
  const [bundle, setBundle] = useState<GuardianBundle | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<GuardianSearchStudent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<FollowUpCategory>("learning");
  const [statement, setStatement] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadMe() {
    try {
      const current = await guardianMe<GuardianBundle>();
      setBundle(current);
      return true;
    } catch {
      setBundle(null);
      return false;
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const status = await guardianBackendStatus();
        setBackendReady(status.ready);
        if (status.ready) await loadMe();
      } catch {
        setBackendReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!backendReady || bundle || search.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void guardianSearch(search.trim())
        .then((result) => setMatches(result.students))
        .catch(() => setMatches([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [backendReady, bundle, search]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setNotice("");
    try {
      await guardianLogin(selectedId);
      await loadMe();
      setSearch("");
      setMatches([]);
    } catch (error) {
      const codeValue = errorCode(error);
      if (codeValue === "ACCESS_DISABLED") setNotice("هذا الطالب غير نشط حاليًا.");
      else setNotice("تعذر فتح صفحة الطالب الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    await guardianLogout().catch(() => undefined);
    setBundle(null);
    setSelectedId("");
    setBusy(false);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const body = message.trim();
    if (!body) return;
    setBusy(true);
    try {
      await guardianSendMessage(body);
      setMessage("");
      await loadMe();
      setNotice("تم إرسال الرسالة للمعلم.");
    } catch {
      setNotice("تعذر إرسال الرسالة. أعد الدخول ثم حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  async function sendFollowUp(event: FormEvent) {
    event.preventDefault();
    if (statement.trim().length < 3) return;
    setBusy(true);
    try {
      await guardianSendFollowUp(category, statement.trim());
      setStatement("");
      await loadMe();
      setNotice("تم إرسال الملاحظة وإضافتها للمتابعة المشتركة.");
    } catch {
      setNotice("تعذر إرسال الملاحظة. أعد الدخول ثم حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const week = academicWeek();
  const subjectById = useMemo(() => new Map((bundle?.subjects ?? []).map((item) => [item.id, text(item.name)])), [bundle]);
  const plans = (bundle?.weeklyPlans ?? []).filter((item) => Number(item.week) === week);
  const spelling = (bundle?.spellingPractices ?? []).find((item) => Number(item.week) === week);
  const values = (bundle?.values ?? []).filter((item) => week >= Number(item.weekFrom ?? 1) && week <= Number(item.weekTo ?? 17));

  const latestAssessment = useMemo(() => {
    const map = new Map<string, Loose>();
    for (const assessment of bundle?.assessments ?? []) {
      const skillId = text(assessment.skillId);
      if (!skillId) continue;
      const previous = map.get(skillId);
      if (!previous || text(assessment.assessedAt) > text(previous.assessedAt)) map.set(skillId, assessment);
    }
    return map;
  }, [bundle]);

  const needsTraining = (bundle?.skills ?? []).filter((skill) => latestAssessment.get(skill.id)?.level === "needs_training");

  if (backendReady === null) {
    return <main className="shell"><div className="notice">جاري فحص بوابة ولي الأمر الآمنة…</div></main>;
  }

  if (!backendReady) {
    return <main className="shell"><header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>بوابة ولي الأمر</h1><p>وضع الربط الحقيقي</p></div></div></header><DateBar /><div className="notice warn">الـBackend غير مهيأ على هذه الاستضافة بعد. لا توجد بيانات خاصة معروضة من الخادم.</div><footer className="site-credit">برمجة سلطان الصاعدي</footer></main>;
  }

  if (!bundle) {
    return (
      <main className="shell">
        <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر الآمنة — تعلّمت</p></div></div></header>
        <DateBar />
        <section className="hero section"><div><h2>دخول ولي الأمر</h2><p>ابحث عن اسم الطالب واختره لفتح صفحته مباشرة.</p></div></section>
        <section className="section"><form className="card stack" onSubmit={login}><label className="stack">اسم الطالب<input className="field" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedId(""); }} placeholder="اكتب حرفين أو أكثر" /></label>{matches.length > 0 && <div className="list">{matches.map((item) => <button className={`row guardian-pick ${selectedId === item.id ? "selected" : ""}`} type="button" key={item.id} onClick={() => setSelectedId(item.id)}><div className="row-main"><div className="avatar">🧒</div><div><h4>{item.name}</h4><small>{item.className}</small></div></div><span className="badge">{selectedId === item.id ? "محدد" : "اختيار"}</span></button>)}</div>}{notice && <div className="notice warn">{notice}</div>}<button className="btn" disabled={busy || !selectedId}>فتح صفحة الطالب</button></form></section>
        <footer className="site-credit">برمجة سلطان الصاعدي</footer>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — الربط الحقيقي</p></div></div><div className="mini-actions no-print"><span className="pill">الأجهزة {bundle.student.guardianDevices}/{bundle.student.guardianDeviceLimit}</span><button className="btn secondary" disabled={busy} type="button" onClick={() => void logout()}>خروج</button></div></header>
      <DateBar />
      <section className="hero section"><div><h2>{bundle.student.name}</h2><p>{bundle.student.className} — البيانات أدناه قادمة من جلسة الطالب نفسها في Firestore.</p></div><div className="hero-stats"><div className="stat"><b>{week}</b><span>الأسبوع</span></div><div className="stat"><b>{bundle.resources.length}</b><span>أوراق واختبارات</span></div><div className="stat"><b>{bundle.valueStars.length}</b><span>نجوم قيم</span></div><div className="stat"><b>{needsTraining.length}</b><span>تحتاج تدريبًا</span></div></div></section>

      <section className="section"><div className="section-head"><h2>خطة الأسبوع {week}</h2><span className="pill">من قاعدة البيانات</span></div><div className="grid">{plans.length ? plans.map((plan) => <div className="card" key={plan.id}><h3>{subjectById.get(text(plan.subjectId)) || "المادة"}</h3><p>{text(plan.title)}</p></div>) : <div className="notice">لا توجد خطة محفوظة لهذا الأسبوع.</div>}</div></section>

      {spelling && <section className="section"><div className="section-head"><h2>✍️ الإملاء والخط</h2></div><div className="card"><h3>{text(spelling.skill) || "تدريب الأسبوع"}</h3><p>{text(spelling.unitName)}</p><span className="pill">الدرجة من {Number(spelling.scoreTotal ?? 10)}</span></div></section>}

      <section className="section"><div className="section-head"><h2>⭐ نجوم القيم</h2><span className="pill">{bundle.valueStars.length} نجمة</span></div><div className="grid">{values.length ? values.map((value) => <div className="card" key={value.id}><h3>{text(value.title)}</h3><p>{text(value.studentText)}</p><small>{text(value.homeSuggestion)}</small></div>) : <div className="notice">لا توجد قيمة نشطة مرتبطة بهذا الأسبوع.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>المهارات التي تحتاج تدريبًا</h2></div><div className="card">{needsTraining.length ? <div className="list">{needsTraining.map((skill) => <div className="row" key={skill.id}><div><h4>{subjectById.get(text(skill.subjectId)) || "المادة"} — {text(skill.category)}</h4><small>{text(skill.title)}</small></div><span className="badge warn">يحتاج تدريب</span></div>)}</div> : <div className="notice">لا توجد مهارة مصنفة «يحتاج تدريب» في آخر تقييم مسجل.</div>}</div></section>

      <section className="section"><div className="section-head"><h2>الأوراق والاختبارات</h2><span className="pill">{bundle.resources.length}</span></div><div className="grid">{bundle.resources.slice(0, 8).map((resource) => <div className="card" key={resource.id}><h3>{text(resource.title)}</h3><p>{text(resource.instructions)}</p><small>{text(resource.kind)}</small></div>)}</div></section>

      {bundle.followUp && <section className="section"><div className="section-head"><h2>المتابعة المشتركة</h2><span className="badge">{text(bundle.followUp.status)}</span></div><div className="card"><div className="kv"><span>الهدف</span><span>{text(bundle.followUp.goal) || "قيد التحديث"}</span></div>{Array.isArray(bundle.followUp.plan) && bundle.followUp.plan.length > 0 && <ul>{bundle.followUp.plan.map((item, index) => <li key={`${String(item)}-${index}`}>{String(item)}</li>)}</ul>}</div></section>}

      <section className="section no-print"><div className="section-head"><h2>رسالة للمعلم</h2></div><div className="card stack"><div className="list">{bundle.messages.slice(-10).map((item) => <div className="row" key={item.id}><div><h4>{item.author === "guardian" ? "ولي الأمر" : "المعلم"}</h4><small>{text(item.body)}</small></div></div>)}</div><form className="stack" onSubmit={sendMessage}><textarea className="field textarea" maxLength={1200} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالتك…" /><button className="btn" disabled={busy || !message.trim()}>إرسال</button></form></div></section>

      <section className="section no-print"><div className="section-head"><h2>ملاحظة مهمة للمتابعة</h2></div><form className="card stack" onSubmit={sendFollowUp}><select className="field" value={category} onChange={(event) => setCategory(event.target.value as FollowUpCategory)}><option value="learning">تعليمية</option><option value="behavior">سلوكية</option><option value="health">صحية مؤثرة على المدرسة</option><option value="family">ظرف أسري مؤثر</option><option value="other">أخرى</option></select><textarea className="field textarea" maxLength={1800} value={statement} onChange={(event) => setStatement(event.target.value)} placeholder="اكتب ما يحتاج المعلم معرفته…" /><button className="btn" disabled={busy || statement.trim().length < 3}>إرسال للمتابعة</button></form></section>

      {notice && <div className="notice">{notice}</div>}
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
