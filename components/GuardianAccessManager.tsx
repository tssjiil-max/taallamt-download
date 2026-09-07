"use client";

import { useState } from "react";
import { useTaallamt } from "@/lib/store";

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function GuardianAccessManager({ studentId }: { studentId: string }) {
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === studentId);
  const [visibleCode, setVisibleCode] = useState("");
  const [status, setStatus] = useState("");

  if (!student) return null;

  async function createCode() {
    const code = randomCode();
    const ok = await store.setGuardianAccessCode(student.id, code);
    if (!ok) return;
    setVisibleCode(code);
    setStatus("تم إنشاء رمز جديد. انسخه الآن وأرسله لولي الأمر؛ لا يُحفظ الرمز بصورته الصريحة.");
  }

  function disable() {
    if (!confirm("تعطيل وصول ولي الأمر وإلغاء الأجهزة الحالية؟")) return;
    store.disableGuardianAccess(student.id);
    setVisibleCode("");
    setStatus("تم تعطيل الوصول وإلغاء الأجهزة في نموذج البناء.");
  }

  return (
    <div className="card">
      <div className="section-head"><h3>وصول ولي الأمر</h3><span className={`badge ${student.guardianAccessEnabled ? "" : "warn"}`}>{student.guardianAccessEnabled ? "مفعّل" : "غير مفعّل"}</span></div>
      <div className="kv"><span>طريقة الدخول</span><span>اسم الطالب + رمز وصول ثابت من 6 أرقام</span></div>
      <div className="kv"><span>الأجهزة</span><span>{student.guardianDevices}/{student.guardianDeviceLimit}</span></div>
      <div className="kv"><span>آخر تحديث للرمز</span><span>{student.guardianCodeUpdatedAt ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(new Date(student.guardianCodeUpdatedAt)) : "لم ينشأ بعد"}</span></div>
      {visibleCode && <div className="notice section"><b>رمز ولي الأمر الجديد:</b><div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, marginTop: 8 }}>{visibleCode}</div><small>يظهر هنا في هذه الجلسة فقط. انسخه قبل مغادرة الصفحة.</small></div>}
      <div className="mini-actions section no-print"><button className="btn" type="button" onClick={createCode}>{student.guardianAccessEnabled ? "إنشاء رمز بديل" : "تفعيل وإنشاء رمز"}</button><button className="btn secondary" type="button" onClick={() => store.setGuardianDevices(student.id, 0)}>إلغاء الأجهزة</button>{student.guardianAccessEnabled && <button className="btn danger" type="button" onClick={disable}>تعطيل الوصول</button>}</div>
      {status && <small className="notification-note">{status}</small>}
      <div className="notice warn section"><b>مرحلة البناء:</b> التحقق يعمل محليًا الآن. عند ربط قاعدة البيانات سيُنفذ التحقق في الخادم وتُربط الجلسة فعليًا بجهازين كحد أقصى.</div>
    </div>
  );
}
