"use client";

import { useEffect, useState } from "react";
import { useTaallamt } from "@/lib/store";
import {
  disableGuardianAccess as disableGuardianAccessRemote,
  getGuardianShareAccess,
  setGuardianAccessCode as setGuardianAccessCodeRemote,
} from "@/lib/teacher-api";

function internalAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function GuardianAccessManager({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === studentId);
  const [shareUrl, setShareUrl] = useState("");
  const [accessEnabled, setAccessEnabled] = useState(Boolean(student?.guardianAccessEnabled));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function urlFor(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/guardian?student=${encodeURIComponent(studentId)}&token=${encodeURIComponent(token)}`;
  }

  useEffect(() => {
    let alive = true;
    getGuardianShareAccess(studentId)
      .then((result) => {
        if (!alive) return;
        setAccessEnabled(result.enabled);
        setShareUrl(result.shareToken ? urlFor(result.shareToken) : "");
      })
      .catch(() => {
        if (alive) setShareUrl("");
      });
    return () => { alive = false; };
  }, [studentId]);

  if (!student) return null;
  const id = student.id;

  async function createLink() {
    setBusy(true);
    setStatus("");
    try {
      const code = internalAccessCode();
      const result = await setGuardianAccessCodeRemote(id, code);
      await store.setGuardianAccessCode(id, code);
      setAccessEnabled(true);
      setShareUrl(urlFor(result.shareToken));
      setStatus("تم تفعيل رابط خاص بهذا الطالب بدون رقم سري.");
      return urlFor(result.shareToken);
    } catch {
      setStatus("تعذر تفعيل رابط الطالب الآن.");
      return "";
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
        return url;
      }
    } catch {}
    return createLink();
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
    const text = `صفحة الطالب ${student.name} في تعلّمت — رابط مباشر دون رقم سري.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `صفحة الطالب - ${student.name}`, text, url });
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
    if (!confirm("تعطيل رابط صفحة الطالب وإلغاء الأجهزة الحالية؟")) return;
    setBusy(true);
    try {
      await disableGuardianAccessRemote(id);
      store.disableGuardianAccess(id);
      setAccessEnabled(false);
      setShareUrl("");
      setStatus("تم تعطيل الرابط وإلغاء جلسات صفحة الطالب.");
    } catch {
      setStatus("تعذر تعطيل الرابط الآن.");
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
      <div className="mini-actions section no-print">
        {!accessEnabled && <button className="btn" disabled={busy} type="button" onClick={() => void createLink()}>تفعيل الرابط</button>}
        <button className="btn" disabled={busy} type="button" onClick={() => void shareLink()}>مشاركة صفحة الطالب</button>
        <button className="btn secondary" disabled={busy} type="button" onClick={() => void copyLink()}>نسخ الرابط</button>
        {accessEnabled && <button className="btn danger" disabled={busy} type="button" onClick={() => void disable()}>تعطيل الرابط</button>}
      </div>
      {status && <div className="notice section" role="status">{status}</div>}
      <small className="notification-note">الرابط خاص بهذا الطالب؛ لا يحتاج ولي الأمر إلى إدخال رمز أو رقم سري.</small>
    </div>
  );
}
