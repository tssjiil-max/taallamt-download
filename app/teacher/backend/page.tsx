"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { guardianBackendStatus, type GuardianBackendStatus } from "@/lib/guardian-api";
import {
  disableGuardianAccess,
  setGuardianAccessCode,
  teacherLogin,
  teacherLogout,
  teacherMe,
  teacherSetup,
  teacherSync,
} from "@/lib/teacher-api";
import { useTaallamt } from "@/lib/store";
import type { TaallamtData } from "@/lib/types";

export default function TeacherBackendPage() {
  const store = useTaallamt();
  const students = useMemo(() => store.students.filter((student) => student.active), [store.students]);
  const [status, setStatus] = useState<GuardianBackendStatus | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");
  const [codeByStudent, setCodeByStudent] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const backend = await guardianBackendStatus();
      setStatus(backend);
      if (backend.teacherAuth) {
        try {
          await teacherMe();
          setAuthenticated(true);
        } catch {
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(false);
      }
    } catch {
      setStatus({ ready: false, firebaseConfigured: false, firebase: false, authSecret: false, guardianAuth: false, teacherAuth: false });
      setAuthenticated(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function setup(event: FormEvent) {
    event.preventDefault();
    if (setupPin !== setupPinConfirm) {
      setNotice("رمزا المعلم غير متطابقين.");
      return;
    }
    if (!/^\d{6}$/.test(setupPin)) {
      setNotice("رمز المعلم يجب أن يكون 6 أرقام.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      await teacherSetup(setupPin);
      setSetupPin("");
      setSetupPinConfirm("");
      setAuthenticated(true);
      setNotice("تم إنشاء رمز المعلم وتخزينه بصورة مشفرة، وفتحت الجلسة الآمنة.");
      await refresh();
    } catch (error) {
      const payload = (error as { payload?: { error?: string } })?.payload;
      setNotice(payload?.error === "ALREADY_CONFIGURED" ? "تم إعداد رمز المعلم مسبقًا؛ استخدم شاشة الدخول." : "تعذر إنشاء رمز المعلم. تحقق من Firestore ومفتاح الحماية ثم أعد المحاولة.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await teacherLogin(pin);
      setPin("");
      setAuthenticated(true);
      setNotice("تم فتح جلسة المعلم الآمنة.");
    } catch (error) {
      const payload = (error as { payload?: { error?: string } })?.payload;
      setNotice(payload?.error === "TOO_MANY_ATTEMPTS" ? "محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة." : "تعذر الدخول. تحقق من رمز المعلم.");
    } finally {
      setBusy(false);
    }
  }

  async function syncCurrentData() {
    setBusy(true);
    setNotice("");
    const snapshot: TaallamtData = {
      terms: store.terms,
      subjects: store.subjects,
      students: store.students,
      weeklyPlans: store.weeklyPlans,
      skills: store.skills,
      assessments: store.assessments,
      resources: store.resources,
      values: store.values,
      valueStars: store.valueStars,
      spellingPractices: store.spellingPractices,
      followUps: store.followUps,
      messages: store.messages,
    };
    try {
      const result = await teacherSync(snapshot);
      setNotice(`تمت مزامنة النسخة الحالية إلى Firestore: ${result.writes} سجلًا. لم يتم المساس برموز أو جلسات أولياء الأمور.`);
    } catch {
      setNotice("تعذرت مزامنة البيانات. لم تُحذف البيانات المحلية؛ تحقق من الربط ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCode(studentId: string) {
    const code = codeByStudent[studentId] ?? "";
    if (!/^\d{6}$/.test(code)) {
      setNotice("رمز ولي الأمر يجب أن يكون 6 أرقام.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      await setGuardianAccessCode(studentId, code);
      setCodeByStudent((current) => ({ ...current, [studentId]: "" }));
      setNotice("تم تفعيل رمز ولي الأمر في Firestore. يمكن الآن اختباره من جهاز آخر.");
    } catch {
      setNotice("تعذر حفظ الرمز في قاعدة البيانات.");
    } finally {
      setBusy(false);
    }
  }

  async function disable(studentId: string) {
    setBusy(true);
    setNotice("");
    try {
      await disableGuardianAccess(studentId);
      setNotice("تم تعطيل وصول ولي الأمر وإلغاء الجلسات الحالية لهذا الطالب.");
    } catch {
      setNotice("تعذر تعطيل الوصول.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await teacherLogout().catch(() => undefined);
    setAuthenticated(false);
    setNotice("تم تسجيل الخروج.");
  }

  if (!store.ready || !status) {
    return <main className="shell"><div className="notice">جاري فحص الربط الخلفي…</div></main>;
  }

  const setupBlockedBySecret = status.firebase && !status.authSecret;

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🔐</div><div><h1>الربط الخلفي</h1><p>قاعدة البيانات والجلسات الآمنة للمعلم وولي الأمر</p></div></div>{authenticated && <button className="btn secondary no-print" type="button" onClick={logout}>خروج المعلم</button>}</header>
      <DateBar />

      <section className="section">
        <div className="section-head"><h2>حالة الجاهزية</h2><span className={`badge ${status.ready ? "" : "warn"}`}>{status.ready ? "جاهز للاستخدام" : status.teacherSetupRequired ? "بقي إنشاء رمز المعلم" : setupBlockedBySecret ? "بقي مفتاح الحماية" : "يحتاج إعداد"}</span></div>
        <div className="grid">
          <div className="card"><h3>Firestore</h3><p>{status.firebase ? "✅ اتصال فعلي ناجح" : status.firebaseConfigured ? "⚠️ بيانات الربط موجودة لكن الاتصال فشل" : "⏳ غير مهيأ"}</p></div>
          <div className="card"><h3>مفتاح الحماية</h3><p>{status.authSecret ? "✅ TAALLAMT_AUTH_PEPPER موجود" : "⏳ أضفه في Vercel"}</p></div>
          <div className="card"><h3>ولي الأمر</h3><p>{status.guardianAuth ? "✅ الأكواد والجلسات محمية" : "⏳ ينتظر Firestore ومفتاح الحماية"}</p></div>
          <div className="card"><h3>المعلم</h3><p>{status.teacherAuth ? "✅ الحماية مهيأة" : status.teacherSetupRequired ? "🔐 أنشئ رمز المعلم مرة واحدة" : "⏳ ينتظر اكتمال الحماية"}</p></div>
        </div>
        {!status.firebase && <div className="notice warn">لن يكتب الموقع أي بيانات حتى ينجح اختبار اتصال Firestore الفعلي.</div>}
        {setupBlockedBySecret && <div className="notice warn">أضف متغير Vercel السري <b>TAALLAMT_AUTH_PEPPER</b> بقيمة عشوائية طويلة لا تقل عن 32 حرفًا، ثم أعد النشر. لا تضع هذه القيمة داخل الكود أو الصفحة.</div>}
      </section>

      {status.teacherSetupRequired && !authenticated && <section className="section"><form className="card stack" onSubmit={setup}><h2>إعداد رمز المعلم لأول مرة</h2><p>اختر رمزًا خاصًا بك من 6 أرقام. يُحفظ Hash مملّح ومحمي بمفتاح الخادم فقط، ولا يُحفظ الرمز الصريح.</p><label className="stack">رمز المعلم<input className="field guardian-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={setupPin} onChange={(event) => setSetupPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><label className="stack">تأكيد الرمز<input className="field guardian-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={setupPinConfirm} onChange={(event) => setSetupPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><button className="btn" disabled={busy || setupPin.length !== 6 || setupPinConfirm.length !== 6}>إنشاء الرمز وفتح الجلسة</button></form></section>}

      {status.ready && !authenticated && <section className="section"><form className="card stack" onSubmit={login}><h2>دخول المعلم الآمن</h2><label className="stack">رمز المعلم من 6 أرقام<input className="field guardian-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><button className="btn" disabled={busy || pin.length !== 6}>دخول</button></form></section>}

      {authenticated && <section className="section"><div className="section-head"><h2>مزامنة البيانات الحالية</h2><span className="pill">آمنة ومحمية بجلسة المعلم</span></div><div className="card"><p>ترفع الطلاب والمواد والتوزيع والمهارات والتقييمات والنجوم والأوراق والرسائل من النسخة الحالية إلى Firestore، مع استبعاد حقول الدخول الحساسة لولي الأمر.</p><button className="btn" disabled={busy} type="button" onClick={() => void syncCurrentData()}>مزامنة إلى Firestore</button></div></section>}

      {authenticated && <section className="section"><div className="section-head"><h2>اختبار دخول ولي الأمر</h2><span className="pill">طالب واحد أولًا</span></div><div className="notice">بعد المزامنة اختر طالبًا واحدًا للاختبار، ضع له رمزًا من 6 أرقام، ثم افتح بوابة ولي الأمر الآمنة من جهاز آخر.</div><div className="list">{students.map((student) => <div className="row" key={student.id}><div className="row-main"><div className="avatar">🧒</div><div><h4>{student.name}</h4><small>{student.className}</small></div></div><div className="mini-actions"><input aria-label={`رمز ${student.name}`} className="field guardian-code" style={{ maxWidth: 130 }} inputMode="numeric" maxLength={6} placeholder="6 أرقام" value={codeByStudent[student.id] ?? ""} onChange={(event) => setCodeByStudent((current) => ({ ...current, [student.id]: event.target.value.replace(/\D/g, "").slice(0, 6) }))} /><button className="btn" disabled={busy} type="button" onClick={() => void saveCode(student.id)}>تفعيل</button><button className="btn secondary" disabled={busy} type="button" onClick={() => void disable(student.id)}>تعطيل</button></div></div>)}</div></section>}

      {notice && <div className="notice">{notice}</div>}
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
