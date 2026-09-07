"use client";

import { ChangeEvent, useState } from "react";

function toBase64Utf8(text: string) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

export default function FirebaseSecretPage() {
  const [encoded, setEncoded] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notice, setNotice] = useState("اختر ملف JSON الذي نزّلته من Firebase. تتم القراءة والتحويل داخل جهازك فقط.");

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setEncoded("");
    setProjectId("");
    setClientEmail("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        type?: unknown;
        project_id?: unknown;
        client_email?: unknown;
        private_key?: unknown;
      };

      if (
        parsed.type !== "service_account" ||
        typeof parsed.project_id !== "string" ||
        typeof parsed.client_email !== "string" ||
        typeof parsed.private_key !== "string" ||
        !parsed.private_key.includes("BEGIN PRIVATE KEY")
      ) {
        setNotice("هذا ليس ملف Service Account صالحًا من Firebase. اختر ملف JSON الذي نزلته من Generate new private key.");
        return;
      }

      setProjectId(parsed.project_id);
      setClientEmail(parsed.client_email);
      setEncoded(toBase64Utf8(text));
      setNotice("✅ الملف سليم. تم تحويله محليًا إلى قيمة واحدة آمنة للنسخ إلى Vercel.");
    } catch {
      setNotice("تعذر قراءة الملف. اختر ملف JSON الأصلي الذي نزّلته من Firebase بدون تعديل.");
    }
  }

  async function copy() {
    if (!encoded) return;
    await navigator.clipboard.writeText(encoded);
    setNotice("✅ تم النسخ. في Vercel أنشئ FIREBASE_SERVICE_ACCOUNT_B64 والصق هذه القيمة في Value.");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🔥</div>
          <div>
            <h1>تجهيز ربط Firebase</h1>
            <p>طريقة واحدة تمنع أخطاء نسخ المفتاح والأسطر من الجوال</p>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="card stack">
          <h2>1) اختر ملف Firebase JSON</h2>
          <p>الملف لا يُرفع للموقع ولا يُرسل للخادم؛ يُقرأ داخل متصفحك فقط.</p>
          <input className="field" type="file" accept="application/json,.json" onChange={onFile} />
        </div>

        {(projectId || clientEmail) && (
          <div className="card stack">
            <h3>تم التحقق من الملف</h3>
            <p><b>Project ID:</b> {projectId}</p>
            <p><b>Service account:</b> {clientEmail}</p>
          </div>
        )}

        {encoded && (
          <div className="card stack">
            <h2>2) انسخ القيمة</h2>
            <textarea className="field" readOnly value={encoded} rows={5} aria-label="Firebase service account base64" />
            <button className="btn" type="button" onClick={() => void copy()}>نسخ القيمة</button>
            <div className="notice">
              في Vercel أنشئ متغيرًا جديدًا باسم <b>FIREBASE_SERVICE_ACCOUNT_B64</b>، والصق القيمة في <b>Value</b>، واختر Production + Preview ثم Save وRedeploy.
            </div>
          </div>
        )}

        <div className="notice">{notice}</div>
      </section>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
