"use client";

import { useEffect, useState } from "react";
import { useTaallamt } from "@/lib/store";

function internalAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function GuardianAccessManager({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === studentId);
  const [shareUrl, setShareUrl] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/guardian?student=${encodeURIComponent(studentId)}`);
    }
  }, [studentId]);

  if (!student) return null;
  const id = student.id;

  async function activateLink() {
    if (student.guardianAccessEnabled) {
      setStatus("الرابط المباشر مفعّل وجاهز للمشاركة.");
      return true;
    }
    const ok = await store.setGuardianAccessCode(id, internalAccessCode());
    if (!ok) {
      setStatus("تعذر تفعيل رابط الطالب الآن.");
      return false;
    }
    setStatus("تم تفعيل رابط صفحة الطالب بدون رقم سري.");
    return true;
  }

  async function copyLink() {
    const ok = await activateLink();
    if (!ok || !shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("تم نسخ رابط صفحة الطالب — يفتح مباشرة دون رقم سري.");
    } catch {
      setStatus("الرابط جاهز أدناه. اضغط عليه مطولًا لنسخه.");
    }
  }

  async function shareLink() {
    const ok = await activateLink();
    if (!ok || !shareUrl) return;
    const text = `صفحة الطالب ${student.name} في تعلّمت — رابط مباشر دون رقم سري.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `صفحة الطالب - ${student.name}`, text, url: shareUrl });
        setStatus("تم فتح خيارات المشاركة.");
      } else {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        setStatus("تم نسخ رابط صفحة الطالب للمشاركة.");
      }
    } catch {
      setStatus("لم تتم المشاركة. الرابط ما زال جاهزًا ويمكن نسخه.");
    }
  }

  function disable() {
    if (!confirm("تعطيل رابط صفحة الطالب وإلغاء الأجهزة الحالية؟")) return;
    store.disableGuardianAccess(id);
    setStatus("تم تعطيل رابط صفحة الطالب وإلغاء الأجهزة الحالية.");
  }

  return (
    <div className="card guardian-direct-access">
      <div className="section-head"><h3>رابط صفحة الطالب</h3><span className={`badge ${student.guardianAccessEnabled ? "" : "warn"}`}>{student.guardianAccessEnabled ? "مفعّل" : "غير مفعّل"}</span></div>
      <div className="kv"><span>طريقة الدخول</span><b>رابط مباشر بدون رقم سري</b></div>
      <div className="kv"><span>الأجهزة المسجلة</span><span>{student.guardianDevices}/{student.guardianDeviceLimit}</span></div>
      {shareUrl && <div className="direct-student-url" dir="ltr">{shareUrl}</div>}
      <div className="mini-actions section no-print">
        {!student.guardianAccessEnabled && <button className="btn" type="button" onClick={() => void activateLink()}>تفعيل الرابط</button>}
        <button className="btn" type="button" onClick={() => void shareLink()}>مشاركة صفحة الطالب</button>
        <button className="btn secondary" type="button" onClick={() => void copyLink()}>نسخ الرابط</button>
        <button className="btn secondary" type="button" onClick={() => store.setGuardianDevices(id, 0)}>إلغاء الأجهزة</button>
        {student.guardianAccessEnabled && <button className="btn danger" type="button" onClick={disable}>تعطيل الرابط</button>}
      </div>
      {status && <div className="notice section" role="status">{status}</div>}
      <small className="notification-note">الرابط خاص بهذا الطالب. أرسله لولي أمره فقط.</small>
    </div>
  );
}
