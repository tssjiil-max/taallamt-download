"use client";

import { useState } from "react";

export default function AuthSecretPage() {
  const [secret, setSecret] = useState("");
  const [notice, setNotice] = useState("");

  function generate() {
    const bytes = new Uint8Array(48);
    window.crypto.getRandomValues(bytes);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    const value = window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    setSecret(value);
    setNotice("تم توليد المفتاح محليًا على جهازك فقط.");
  }

  async function copy() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setNotice("تم النسخ. الصقه في Vercel كقيمة TAALLAMT_AUTH_PEPPER ثم لا تشاركه مع أحد.");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="logo">🔐</div>
          <div>
            <h1>مفتاح الحماية</h1>
            <p>توليد آمن محليًا لمفتاح TAALLAMT_AUTH_PEPPER</p>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="card stack">
          <h2>توليد المفتاح</h2>
          <p>اضغط الزر مرة واحدة. المفتاح لا يُرسل إلى الخادم ولا يُحفظ داخل الموقع.</p>
          <button className="btn" type="button" onClick={generate}>توليد مفتاح عشوائي آمن</button>
          {secret && (
            <>
              <input className="field" readOnly value={secret} aria-label="مفتاح الحماية المولد" />
              <button className="btn secondary" type="button" onClick={() => void copy()}>نسخ المفتاح</button>
            </>
          )}
          {notice && <div className="notice">{notice}</div>}
        </div>
      </section>
    </main>
  );
}
