"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTaallamt } from "@/lib/store";

type Mode = "قراءة" | "تسميع" | "تصحيح" | "إملاء";

export default function ShakabumboPage() {
  const { students } = useTaallamt();
  const active = students.filter((student) => student.active);
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("قراءة");
  const [firstNameOnly, setFirstNameOnly] = useState(true);
  const [copied, setCopied] = useState(false);
  const student = active.find((item) => item.id === selectedId) ?? active[0];
  const displayName = student ? (firstNameOnly ? student.name.split(" ")[0] : student.name) : "الطالب";

  const prompt = useMemo(() => `أنت «شكابمبو»، مساعد صفي لطيف لطلاب الصف الثاني الابتدائي.\n\nخاطب الطالب ${displayName} بالعربية المبسطة وبجمل قصيرة.\nالمهمة الآن: ${mode}.\n\nقواعد العمل:\n- اطلب من الطالب تنفيذ خطوة واحدة فقط في كل مرة، ثم انتظر إجابته.\n- لا تعط الإجابة قبل أن يحاول الطالب.\n- عند التصحيح: ابدأ بما أتقنه، ثم صحح الخطأ باختصار، واطلب منه المحاولة مرة أخرى.\n- استخدم تشجيعًا قصيرًا بدون مبالغة.\n- لا تذكر درجات أو معلومات شخصية، ولا تنتقل إلى طالب آخر إلا بأمر المعلم.\n- في القرآن الكريم: لا تخمّن نص آية ولا تغيّرها؛ اعتمد النص الذي يقدمه المعلم في المحادثة، وإذا لم يتوفر فاطلب منه تحديد السورة والآيات.\n- المعلم هو من يقرر متى تبدأ ومتى تتوقف.\n\nابدأ بنداء الطالب: «يا ${displayName}، جاهز؟» ثم انتظر.`, [displayName, mode]);

  function randomStudent() {
    if (!active.length) return;
    setSelectedId(active[Math.floor(Math.random() * active.length)].id);
    setCopied(false);
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🤖</div><div><h1>شكابمبو</h1><p>المساعد الصفي — وضع محادثة ChatGPT Plus</p></div></div><Link className="btn secondary no-print" href="/">الرئيسية</Link></header>

      <section className="card shak-hero">
        <img className="shak-image" src="/shakabumbo.jpg" alt="شخصية شكابمبو" />
        <div><h2 style={{marginTop: 0}}>شكابمبو جاهز للفصل</h2><p>هذه المرحلة لا تستخدم API ولا ترسل بيانات الطلاب تلقائيًا. الموقع يجهز لك تعليمات المحادثة، تنسخها ثم تفتح ChatGPT Plus وتلصقها في محادثتك.</p><div className="notice warn section">الاسم الأول فقط مفعّل افتراضيًا لتقليل مشاركة بيانات الطالب. ويمكنك تغيير ذلك يدويًا وقت الحاجة.</div></div>
      </section>

      <section className="section two no-print">
        <div className="card stack"><h3>1. اختر الطالب والمهمة</h3><select className="field" value={student?.id ?? ""} onChange={(e) => { setSelectedId(e.target.value); setCopied(false); }}>{active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="btn secondary" onClick={randomStudent}>🎲 اختيار طالب عشوائي</button><select className="field" value={mode} onChange={(e) => { setMode(e.target.value as Mode); setCopied(false); }}><option>قراءة</option><option>تسميع</option><option>تصحيح</option><option>إملاء</option></select><label><input type="checkbox" checked={firstNameOnly} onChange={(e) => setFirstNameOnly(e.target.checked)} /> استخدام الاسم الأول فقط</label></div>
        <div className="card stack"><h3>2. شغّل المحادثة</h3><button className="btn" onClick={copyPrompt}>{copied ? "✓ تم النسخ" : "نسخ تعليمات شكابمبو"}</button><a className="btn green" href="https://chatgpt.com/" target="_blank" rel="noreferrer">فتح ChatGPT Plus ↗</a><small>بعد فتح ChatGPT الصق التعليمات، ثم أعطه النص أو الكلمات أو الآيات التي تريد التدريب عليها.</small></div>
      </section>

      <section className="section"><div className="section-head"><h2>التعليمات الجاهزة</h2></div><div className="prompt-box">{prompt}</div></section>

      <section className="section"><div className="card"><h3>التطوير لاحقًا</h3><p>تم فصل شكابمبو كميزة مستقلة حتى نستطيع مستقبلًا تحويله من «نسخ وفتح محادثة» إلى مساعد ذكاء اصطناعي مدمج بالصوت والاستماع والتصحيح عند اعتماد طريقة الربط المناسبة، بدون إعادة بناء النظام من الصفر.</p></div></section>
    </main>
  );
}
