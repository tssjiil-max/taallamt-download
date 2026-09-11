"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTaallamt } from "@/lib/store";
import {
  disableGuardianAccess as disableGuardianAccessRemote,
  getGuardianShareAccess,
  setGuardianAccessCode as setGuardianAccessCodeRemote,
  teacherLogin,
} from "@/lib/teacher-api";

function internalAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function appOrigin() {
  if (typeof window === "undefined") return "";
  if (window.location.hostname.endsWith("vercel.app")) return "https://taallamt-teacher.vercel.app";
  return window.location.origin;
}

export function GuardianAccessManager({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === studentId);
  const [shareUrl, setShareUrl] = useState("");
  const [accessEnabled, setAccessEnabled] = useState(Boolean(student?.guardianAccessEnabled));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [pin, setPin] = useState("");

  function urlFor(token: string) {
    const origin = appOrigin();
    if (!origin) return "";
    return `${origin}/guardian?student=${encodeURIComponent(studentId)}&token=${encodeURIComponent(token)}`;
  }

  function markAuthError(error: unknown) {
    const info = error as { status?: number; payload?: { error?: string } };
    if (info.status === 401 || info.payload?.error === "INVALID_SESSION") {
      setNeedsLogin(true);
      setStatus("انتهت جلسة المعلم. أدخل رمز المعلم مرة واحدة هنا ثم أكمل التفعيل.");
      return true;
    }
    return false;
  }

  useEffect(() => {
    let alive = true;
    getGuardianShareAccess(studentId)
      .then((result) => {
        if (!alive) return;
        setAccessEnabled(result.enabled);
        setShareUrl(result.shareToken ? urlFor(result.shareToken) : "");
        setNeedsLogin(false);
      })
      .catch((error) => {
        if (!alive) return;
        setAccessEnabled(false);
        setShareUrl("");
        markAuthError(error);
      });
    return () => { alive = false; };
  }, [studentId]);

  if (!student) return null;
  const id = student.id;
  const studentName = student.name;
  const studentClassName = student.className;

  async function activateLink() {
    const code = internalAccessCode();
    const result = await setGuardianAccessCodeRemote(id, code, { name: studentName, className: studentClassName });
    await store.setGuardianAccessCode(id, code);
    const url = urlFor(result.shareToken);
    setAccessEnabled(true);
    setShareUrl(url);
    setNeedsLogin(false);
    setStatus("تم تفعيل رابط خاص بهذا الطالب بدون رقم سري.");
    return url;
  }

  async function createLink() {
    setBusy(true);
    setStatus("");
    try {
      return await activateLink();
    } catch (error) {
      if (markAuthError(error)) return "";
      const info = error as { payload?: { error?: string } };
      setStatus(
        info.payload?.error === "BACKEND_NOT_CONFIGURED"
          ? "الربط الخلفي غير مفعّل على هذه النسخة."
          : "تعذر تفعيل رابط الطالب الآن. أعد المحاولة.",
      );
      return "";
    } finally {
      setBusy(false);
    }
  }

  async function loginAndContinue(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setStatus("أدخل رمز المعلم المكوّن من 6 أرقام.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      await teacherLogin(pin);
      setPin("");
      setNeedsLogin(false);
      const current = await getGuardianShareAccess(id);
      if (current.enabled && current.shareToken) {
        const url = urlFor(current.shareToken);
        setAccessEnabled(true);
        setShareUrl(url);
        setStatus("تم فتح جلسة المعلم والرابط جاهز.");
      } else {
        await activateLink();
      }
    } catch {
      setNeedsLogin(true);
      setStatus("تعذر فتح جلسة المعلم. تحقق من الرمز ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  async function ensureLink() {
    if (shareUrl) return shareUrl;
    try {
      const current = await getGuardianShareAccess(id);
      if (current.enabled && current.shareToken) {
        const url = urlFor(current.shareToken);
        setAccessEnabled(true);
        setShareUrl(url);
        setNeedsLogin(false);
        return url;
      }
    } catch (error) {
      if (markAuthError(error)) return "";
    }
    return createLink();
  }

  async function openStudentPage() {
    const url = await ensureLink();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("تم فتح صفحة الطالب بالرابط المباشر.");
  }

  async function copyLink() {
    const url = await ensureLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setStatus("تم نسخ رابط صفحة الطالب — يفتح مباشرة دون رقم سري.");
    } catch {
      setStatus("الرابط جاهز أدناه. اضغط عليه مطولًا لنسخه.");
    }
  }

  async function shareLink() {
    const url = await ensureLink();
    if (!url) return;
    const text = `صفحة الطالب ${studentName} في تعلّمت — رابط مباشر دون رقم سري.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `صفحة الطالب - ${studentName}`, text, url });
        setStatus("تم فتح خيارات المشاركة.");
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setStatus("تم نسخ رابط صفحة الطالب للمشاركة.");
      }
    } catch {
      setStatus("لم تتم المشاركة. الرابط ما زال جاهزًا ويمكن نسخه.");
    }
  }

  async function disable() {
    setBusy(true);
    setStatus("");
    try {
      await disableGuardianAccessRemote(id);
      store.disableGuardianAccess(id);
      setAccessEnabled(false);
      setShareUrl("");
      setConfirmDisable(false);
      setStatus("تم تعطيل الرابط وإلغاء جلسات صفحة الطالب.");
    } catch (error) {
      if (!markAuthError(error)) setStatus("تعذر تعطيل الرابط الآن.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card guardian-direct-access">
      <div className="section-head"><h3>رابط صفحة الطالب</h3><span className={`badge ${accessEnabled ? "" : "warn"}`}>{accessEnabled ? "مفعّل" : "غير مفعّل"}</span></div>
      <div className="kv"><span>طريقة الدخول</span><b>رابط مباشر بدون رقم سري</b></div>
      <div className="kv"><span>الحماية</span><span>الرابط موقّع ومخصص لهذا الطالب</span></div>
      {shareUrl && <div className="direct-student-url" dir="ltr">{shareUrl}</div>}

      {needsLogin && (
        <form className="guardian-inline-login no-print" onSubmit={(event) => void loginAndContinue(event)}>
          <b>إعادة فتح جلسة المعلم</b>
          <p>أدخل رمز المعلم مرة واحدة، وبعدها سيعمل التفعيل والفتح والنسخ والمشاركة مباشرة.</p>
          <div className="guardian-inline-login-row">
            <input className="field guardian-code" aria-label="رمز المعلم" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6 أرقام" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            <button className="btn" type="submit" disabled={busy || pin.length !== 6}>{busy ? "جاري الدخول…" : "دخول وتفعيل"}</button>
          </div>
        </form>
      )}

      <div className="guardian-access-actions no-print">
        {!accessEnabled && <button className="btn" disabled={busy} type="button" onClick={() => void createLink()}>{busy ? "جاري التفعيل…" : "تفعيل الرابط"}</button>}
        <button className="btn secondary" disabled={busy} type="button" onClick={() => void openStudentPage()}>فتح صفحة الطالب</button>
        <button className="btn" disabled={busy} type="button" onClick={() => void shareLink()}>مشاركة صفحة الطالب</button>
        <button className="btn secondary" disabled={busy} type="button" onClick={() => void copyLink()}>نسخ الرابط</button>
        {accessEnabled && !confirmDisable && <button className="btn danger" disabled={busy} type="button" onClick={() => setConfirmDisable(true)}>تعطيل الرابط</button>}
      </div>
      {confirmDisable && <div className="inline-confirm no-print" role="dialog" aria-label="تأكيد تعطيل رابط الطالب">
        <div><b>تعطيل رابط صفحة الطالب؟</b><small>سيتم إلغاء الرابط الحالي والجلسات المفتوحة للعائلة. يمكنك إنشاء رابط جديد لاحقًا.</small></div>
        <div className="mini-actions"><button className="btn danger" disabled={busy} type="button" onClick={() => void disable()}>{busy ? "جاري التعطيل…" : "نعم، تعطيل"}</button><button className="btn secondary" disabled={busy} type="button" onClick={() => setConfirmDisable(false)}>إلغاء</button></div>
      </div>}
      {status && <div className="notice guardian-access-status" role="status">{status}</div>}
      <small className="notification-note">الرابط خاص بهذا الطالب؛ لا يحتاج ولي الأمر إلى إدخال رمز أو رقم سري.</small>
    </div>
  );
}
