"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { useTaallamt } from "@/lib/store";

type Mode = "اقرأ معي" | "اسمعني" | "إملاء خفيف" | "تحدي كلمة" | "اختر الصحيح" | "قصة قصيرة" | "تصحيح لطيف" | "مراجعة القرآن";

const providers = [
  { name: "ChatGPT Plus", url: "https://chatgpt.com/", color: "#1769aa", mode: "فتح ونسخ التعليمات" },
  { name: "OpenAI API", url: "#api-settings", color: "#168a89", mode: "ربط آلي من الخادم" },
  { name: "Gemini API", url: "#api-settings", color: "#3567d6", mode: "ربط آلي من الخادم" },
] as const;

export default function ShakabumboPage() {
  const { students } = useTaallamt();
  const active = students.filter((student) => student.active);
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? "");
  const [mode, setMode] = useState<Mode>("اقرأ معي");
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

  function launchProvider(url: string) {
    if(url.startsWith("#")){document.getElementById("api-settings")?.scrollIntoView({behavior:"smooth"});return}
    window.open(url, "_blank", "noopener,noreferrer"); void copyPrompt();
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🤖</div><div><h1>شكابمبو</h1><p>مساعد صفي يعمل مع أكثر من ذكاء اصطناعي</p></div></div><Link className="btn secondary no-print" href="/">الرئيسية</Link></header>

      <section className="card shak-hero">
        <img className="shak-image" src="/shakabumbo-guardian.webp" alt="شخصية شكابمبو" />
        <div><h2 style={{marginTop: 0}}>شكابمبو جاهز للفصل</h2><p>اختر نشاطًا خفيفًا، ثم افتحه في المساعد الذي تفضله. لا تُرسل بيانات الطالب تلقائيًا.</p><div className="notice warn section">يُستخدم الاسم الأول فقط افتراضيًا، ويبقى المعلم مشرفًا على المحادثة.</div></div>
      </section>

      <section className="section two no-print">
        <div className="card stack"><h3>1. اختر الطالب والنشاط</h3><select className="field" value={student?.id ?? ""} onChange={(e) => { setSelectedId(e.target.value); setCopied(false); }}>{active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="btn secondary" onClick={randomStudent}>🎲 اختيار طالب عشوائي</button><div className="shak-activities">{(["اقرأ معي","اسمعني","إملاء خفيف","تحدي كلمة","اختر الصحيح","قصة قصيرة","تصحيح لطيف","مراجعة القرآن"] as Mode[]).map(item=><button type="button" className={mode===item?"active":""} onClick={()=>{setMode(item);setCopied(false)}} key={item}>{item}</button>)}</div><label><input type="checkbox" checked={firstNameOnly} onChange={(e) => setFirstNameOnly(e.target.checked)} /> استخدام الاسم الأول فقط</label></div>
        <div className="card stack"><h3>2. اختر المساعد</h3><button className="btn" onClick={copyPrompt}>{copied ? "✓ تم نسخ تعليمات شكابمبو" : "نسخ التعليمات فقط"}</button><div className="ai-provider-grid">{providers.map(provider=><button type="button" style={{"--provider":provider.color} as CSSProperties} onClick={()=>launchProvider(provider.url)} key={provider.name}><b>{provider.name}</b><small>{provider.mode}</small></button>)}</div><small>ChatGPT Plus يعمل بالفتح والنسخ اليدوي؛ الربط داخل الموقع يحتاج OpenAI API أو Gemini API محفوظًا في الخادم.</small></div>
      </section>

      <section className="section"><div className="section-head"><h2>التعليمات الجاهزة</h2></div><div className="prompt-box">{prompt}</div></section>

      <section className="section" id="api-settings"><div className="card"><h3>الربط الآمن</h3><p>طبقة المزود جاهزة للاختيار بين OpenAI وGemini من الخادم. لا يُحفظ أي مفتاح في المتصفح، ويستمر تعلّمت في العمل دون ذكاء اصطناعي.</p></div></section>
      <section className="section"><div className="card"><h3>أمان الاستخدام مع الطفل</h3><p>المحادثة قصيرة، خطوة واحدة كل مرة، ولا تظهر الدرجات أو البيانات الشخصية. النص القرآني يقدمه المعلم ولا يُترك للمساعد كي يخمّنه.</p></div></section>
    </main>
  );
}
