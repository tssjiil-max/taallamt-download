"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DateBar } from "@/components/DateBar";
import { guardianBackendStatus, type GuardianBackendStatus } from "@/lib/guardian-api";
import { disableGuardianAccess, setGuardianAccessCode, teacherLogin, teacherLogout, teacherMe } from "@/lib/teacher-api";
import { useTaallamt } from "@/lib/store";

export default function TeacherBackendPage() {
  const store = useTaallamt();
  const students = useMemo(() => store.students.filter((student) => student.active), [store.students]);
  const [status, setStatus] = useState<(GuardianBackendStatus & { teacherAuth?: boolean }) | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [codeByStudent, setCodeByStudent] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const backend = await guardianBackendStatus();
      setStatus(backend);
      if (backend.ready) {
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
      setStatus({ ready: false, firebase: false, guardianAuth: false, teacherAuth: false });
      setAuthenticated(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await teacherLogin(pin);
      setPin("");
      setAuthenticated(true);
      setNotice("تم فتح جلسة المعلم الآمنة.");
    } catch {
      setNotice("تعذر الدخول. تحقق من رمز المعلم أو إعدادات الخادم.");
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

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🔐</div><div><h1>الربط الخلفي</h1><p>اختبار قاعدة البيانات والجلسات قبل تحويل الموقع بالكامل</p></div></div>{authenticated && <button className="btn secondary no-print" type="button" onClick={logout}>خروج المعلم</button>}</header>
      <DateBar />

      <section className="section">
        <div className="section-head"><h2>حالة الجاهزية</h2><span className={`badge ${status.ready ? "" : "warn"}`}>{status.ready ? "جاهز للاختبار" : "يحتاج إعداد"}</span></div>
        <div className="grid">
          <div className="card"><h3>Firestore</h3><p>{status.firebase ? "✅ متصل" : "⏳ غير مهيأ"}</p></div>
          <div className="card"><h3>ولي الأمر</h3><p>{status.guardianAuth ? "✅ أسرار الجلسات موجودة" : "⏳ يحتاج متغيرات البيئة"}</p></div>
          <div className="card"><h3>المعلم</h3><p>{status.teacherAuth ? "✅ الحماية مهيأة" : "⏳ يحتاج PIN hash وSession secret"}</p></div>
        </div>
        {!status.ready && <div className="notice warn">لا تُدخل أي مفاتيح خاصة داخل الصفحة. إعداد Firebase والأسرار يتم في متغيرات بيئة الاستضافة فقط.</div>}
      </section>

      {status.ready && !authenticated && <section className="section"><form className="card stack" onSubmit={login}><h2>دخول المعلم الآمن</h2><label className="stack">رمز المعلم من 6 أرقام<input className="field guardian-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></label><button className="btn" disabled={busy || pin.length !== 6}>دخول</button></form></section>}

      {authenticated && <section className="section"><div className="section-head"><h2>اختبار دخول ولي الأمر</h2><span className="pill">طالب واحد أولًا</span></div><div className="notice">اختر طالبًا واحدًا فقط للاختبار، ضع له رمزًا من 6 أرقام، ثم افتح بوابة ولي الأمر من جهاز آخر.</div><div className="list">{students.map((student) => <div className="row" key={student.id}><div className="row-main"><div className="avatar">🧒</div><div><h4>{student.name}</h4><small>{student.className}</small></div></div><div className="mini-actions"><input aria-label={`رمز ${student.name}`} className="field guardian-code" style={{ maxWidth: 130 }} inputMode="numeric" maxLength={6} placeholder="6 أرقام" value={codeByStudent[student.id] ?? ""} onChange={(event) => setCodeByStudent((current) => ({ ...current, [student.id]: event.target.value.replace(/\D/g, "").slice(0, 6) }))} /><button className="btn" disabled={busy} type="button" onClick={() => void saveCode(student.id)}>تفعيل</button><button className="btn secondary" disabled={busy} type="button" onClick={() => void disable(student.id)}>تعطيل</button></div></div>)}</div></section>}

      {notice && <div className="notice">{notice}</div>}
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
