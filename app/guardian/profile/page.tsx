"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { guardianMe, guardianSaveProfile } from "@/lib/guardian-api";
import type { MasteryLevel, ValueStar, ValueTarget } from "@/lib/types";

type Profile = { preferredName?: string; interests?: string; strengths?: string; learningDifficulties?: string; helpfulNotes?: string; photoDataUrl?: string };
type Bundle = {
  student: { name: string; className: string; subjectLevels: Record<string, MasteryLevel> };
  profile: Profile | null;
  valueStars: ValueStar[];
  values: ValueTarget[];
};
const levelLabel: Record<MasteryLevel,string> = { mastered:"متقن", partial:"أتقن البعض", needs_training:"يحتاج تدريب" };

export default function GuardianProfilePage() {
  const [bundle,setBundle] = useState<Bundle|null>(null);
  const [form,setForm] = useState({ preferredName:"", interests:"", strengths:"", learningDifficulties:"", helpfulNotes:"", photoDataUrl:"" });
  const [busy,setBusy] = useState(false); const [notice,setNotice] = useState("");
  useEffect(()=>{ guardianMe<Bundle>().then((b)=>{ setBundle(b); const p=b.profile??{}; setForm({ preferredName:p.preferredName??"", interests:p.interests??"", strengths:p.strengths??"", learningDifficulties:p.learningDifficulties??"", helpfulNotes:p.helpfulNotes??"", photoDataUrl:p.photoDataUrl??"" }); }).catch(()=>location.href="/guardian"); },[]);

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith("image/")){setNotice("اختر صورة فقط.");return;}
    const img=new Image(); const reader=new FileReader();
    reader.onload=()=>{ img.onload=()=>{ const max=360; const scale=Math.min(1,max/Math.max(img.width,img.height)); const canvas=document.createElement("canvas"); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); const ctx=canvas.getContext("2d"); if(!ctx)return; ctx.drawImage(img,0,0,canvas.width,canvas.height); const data=canvas.toDataURL("image/jpeg",.72); if(data.length>270000){setNotice("الصورة كبيرة. اختر صورة أصغر.");return;} setForm(v=>({...v,photoDataUrl:data})); setNotice(""); }; img.src=String(reader.result); }; reader.readAsDataURL(file);
  }
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setNotice("");try{await guardianSaveProfile(form);setNotice("تم حفظ ملف الطالب.");}catch{setNotice("تعذر الحفظ الآن.");}finally{setBusy(false)}}
  if(!bundle) return <main className="shell"><div className="empty-state">جاري فتح ملف الطالب…</div></main>;
  const stars=bundle.valueStars.length;
  const awards=[...new Set(bundle.valueStars.map(s=>s.valueId))].map(id=>({id,count:bundle.valueStars.filter(s=>s.valueId===id).length,title:bundle.values.find(v=>v.id===id)?.title??"قيمة إيجابية"})).filter(x=>x.count>=8);
  return <main className="shell guardian-shell">
    <header className="guardian-header"><div className="teacher-brand-block"><div className="brand-mark">ت</div><div><h1>ملف ابني</h1><p>{bundle.student.name} · {bundle.student.className}</p></div></div><Link className="btn secondary" href="/guardian">رجوع</Link></header>
    <section className="ui-section first-ui-section"><div className="profile-hero card"><div className="profile-photo">{form.photoDataUrl?<img src={form.photoDataUrl} alt="صورة الطالب"/>:<span>🧒</span>}</div><div><h2>{form.preferredName||bundle.student.name}</h2><p>{bundle.student.className}</p><div className="profile-stars" aria-label={`${stars} نجمة`}>⭐ <b>{stars}</b></div></div></div></section>
    <section className="ui-section"><div className="section-title-row"><div><h2>المستوى والجوائز</h2><p>هذه البيانات من نظام المعلم ولا يستطيع ولي الأمر تعديلها.</p></div></div><div className="square-grid profile-level-grid">{Object.entries(bundle.student.subjectLevels).map(([id,level])=><div className="square-card compact-profile-card" key={id}><div className="square-icon green">✓</div><b>{levelLabel[level]}</b><small>تقييم مسجل</small></div>)}</div>{awards.length?<div className="award-strip">{awards.map(a=><div className="award-chip" key={a.id}>🏆 {a.title}</div>)}</div>:<div className="empty-state compact-empty">لا توجد جوائز مكتسبة بعد.</div>}</section>
    <form onSubmit={save} className="ui-section stack"><div className="section-title-row"><div><h2>بيانات يعرفنا بها ولي الأمر</h2><p>معلومات مختصرة تساعد المعلم على فهم الطالب ودعمه.</p></div></div>
      <label className="photo-picker card"><span>📷 تغيير صورة الطالب</span><input type="file" accept="image/*" onChange={pickPhoto}/></label>
      <label className="stack">الاسم الذي يحب أن نناديه به<input className="field" maxLength={80} value={form.preferredName} onChange={e=>setForm(v=>({...v,preferredName:e.target.value}))}/></label>
      <label className="stack">اهتماماته وما يحبه<textarea className="field textarea" maxLength={500} value={form.interests} onChange={e=>setForm(v=>({...v,interests:e.target.value}))} placeholder="مثال: القراءة، الرسم، الرياضة…"/></label>
      <label className="stack">نقاط القوة التي تلاحظها<textarea className="field textarea" maxLength={500} value={form.strengths} onChange={e=>setForm(v=>({...v,strengths:e.target.value}))}/></label>
      <label className="stack">صعوبات يواجهها<textarea className="field textarea" maxLength={1000} value={form.learningDifficulties} onChange={e=>setForm(v=>({...v,learningDifficulties:e.target.value}))} placeholder="صف ما تلاحظه دون تشخيص طبي."/></label>
      <label className="stack">معلومات أخرى تساعد المعلم<textarea className="field textarea" maxLength={1000} value={form.helpfulNotes} onChange={e=>setForm(v=>({...v,helpfulNotes:e.target.value}))}/></label>
      {notice&&<div className="notice">{notice}</div>}<button className="btn" disabled={busy}>{busy?"جاري الحفظ…":"حفظ ملف الطالب"}</button>
    </form>
    <section className="ui-section"><div className="notice warn"><b>الصعوبات والخطة</b><br/>بعد حفظ الصعوبات هنا، استخدم قسم «المتابعة الخاصة» في الصفحة الرئيسية لإرسال ما يحتاج تدخل المعلم؛ يراجع المعلم الحالة ويضع الهدف والخطة، وتظهر الخطة لولي الأمر من النظام.</div></section>
    <footer className="site-credit">برمجة سلطان الصاعدي</footer>
  </main>;
}
