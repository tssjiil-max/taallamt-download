"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { guardianMe, guardianSaveProfile } from "@/lib/guardian-api";
import type { ValueStar } from "@/lib/types";

type Profile = { preferredName?: string; interests?: string; strengths?: string; learningDifficulties?: string; helpfulNotes?: string; photoDataUrl?: string };
type Bundle = { student: { name: string; className: string }; profile: Profile | null; valueStars: ValueStar[] };

export default function GuardianProfilePage() {
 const [bundle,setBundle]=useState<Bundle|null>(null);
 const [form,setForm]=useState({preferredName:"",interests:"",strengths:"",learningDifficulties:"",helpfulNotes:"",photoDataUrl:""});
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{guardianMe<Bundle>().then(b=>{setBundle(b);const p=b.profile??{};setForm({preferredName:p.preferredName??"",interests:p.interests??"",strengths:p.strengths??"",learningDifficulties:p.learningDifficulties??"",helpfulNotes:p.helpfulNotes??"",photoDataUrl:p.photoDataUrl??""})}).catch(()=>location.href="/guardian")},[]);
 function pickPhoto(event:ChangeEvent<HTMLInputElement>){const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){setNotice("اختر صورة فقط.");return}const img=new Image(),reader=new FileReader();reader.onload=()=>{img.onload=()=>{const max=360,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext("2d");if(!ctx)return;ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL("image/jpeg",.72);if(data.length>270000){setNotice("الصورة كبيرة. اختر صورة أصغر.");return}setForm(v=>({...v,photoDataUrl:data}));setNotice("")};img.src=String(reader.result)};reader.readAsDataURL(file)}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setNotice("");try{await guardianSaveProfile(form);setNotice("تم حفظ إعدادات الطالب.")}catch{setNotice("تعذر الحفظ الآن.")}finally{setBusy(false)}}
 if(!bundle)return <main className="shell"><div className="empty-state">جاري فتح إعدادات الطالب…</div></main>;
 return <main className="shell guardian-shell"><header className="guardian-header"><div className="teacher-brand-block"><div className="brand-mark">ت</div><div><h1>إعدادات الطالب</h1><p>{bundle.student.name} · {bundle.student.className}</p></div></div><Link className="btn secondary" href="/guardian">رجوع</Link></header>
 <form onSubmit={save} className="ui-section first-ui-section stack"><label className="profile-settings-hero card"><span className="profile-photo editable-photo">{form.photoDataUrl?<img src={form.photoDataUrl} alt="صورة الطالب"/>:<span>🧒</span>}<b>📷</b></span><span><strong>{form.preferredName||bundle.student.name}</strong><small>{bundle.student.className}</small><em>اضغط لتغيير الصورة</em></span><input type="file" accept="image/*" onChange={pickPhoto}/></label>
 <div className="section-title-row"><div><h2>بيانات يعرفنا بها ولي الأمر</h2><p>معلومات مختصرة تساعد المعلم على فهم الطالب ودعمه.</p></div></div>
 <label className="stack">الاسم الذي يحب أن نناديه به<input className="field" maxLength={80} value={form.preferredName} onChange={e=>setForm(v=>({...v,preferredName:e.target.value}))}/></label>
 <label className="stack">اهتماماته وما يحبه<textarea className="field textarea" maxLength={500} value={form.interests} onChange={e=>setForm(v=>({...v,interests:e.target.value}))} placeholder="مثال: القراءة، الرسم، الرياضة…"/></label>
 <label className="stack">نقاط القوة التي تلاحظها<textarea className="field textarea" maxLength={500} value={form.strengths} onChange={e=>setForm(v=>({...v,strengths:e.target.value}))}/></label>
 <label className="stack">صعوبات يواجهها<textarea className="field textarea" maxLength={1000} value={form.learningDifficulties} onChange={e=>setForm(v=>({...v,learningDifficulties:e.target.value}))} placeholder="صف ما تلاحظه دون تشخيص طبي."/></label>
 <label className="stack">معلومات أخرى تساعد المعلم<textarea className="field textarea" maxLength={1000} value={form.helpfulNotes} onChange={e=>setForm(v=>({...v,helpfulNotes:e.target.value}))}/></label>
 {notice&&<div className="notice">{notice}</div>}<button className="btn" disabled={busy}>{busy?"جاري الحفظ…":"حفظ الإعدادات"}</button></form>
 <footer className="site-credit">برمجة سلطان الصاعدي</footer></main>
}
