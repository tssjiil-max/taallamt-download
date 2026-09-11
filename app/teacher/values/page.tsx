"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {useTaallamt} from "@/lib/store";
import type {BehaviorContext,BehaviorLevel} from "@/lib/types";

const behaviors=[
 ["instructions","الالتزام بالتعليمات"],["discipline","الانضباط داخل الصف"],["respect","احترام الآخرين"],["participation","المشاركة الإيجابية"],["responsibility","تحمل المسؤولية"],
 ["cooperation","التعاون مع الزملاء"],["property","المحافظة على الممتلكات"],["cleanliness","النظافة والترتيب"],["permission","الاستئذان وآداب الحديث"],["honesty","الصدق والأمانة"],
] as const;
const labels:Record<BehaviorLevel,string>={excellent:"متميز ⭐",good:"جيد ✓",needs_follow_up:"يحتاج متابعة !"};

export default function BehaviorPage(){
 const store=useTaallamt(),students=store.students.filter(x=>x.active);const [behaviorId,setBehaviorId]=useState("instructions"),[context,setContext]=useState<BehaviorContext>("classroom"),[showAll,setShowAll]=useState(false),[notice,setNotice]=useState("");
 const selected=behaviors.find(x=>x[0]===behaviorId)??behaviors[0],shown=showAll?behaviors:behaviors.slice(0,5);
 const current=useMemo(()=>new Map(store.behaviorEvaluations.filter(x=>x.behaviorId===behaviorId&&x.context===context).map(x=>[x.studentId,x.level])),[store.behaviorEvaluations,behaviorId,context]);
 function allGood(){students.forEach(s=>store.setBehaviorEvaluation(s.id,behaviorId,context,"good"));setNotice("تم تحديد الجميع «جيد». عدّل الاستثناءات فقط.")}
 return <main className="shell inner-shell"><header className="subject-hero"><img src="/guardian-icons/trophy.svg" alt=""/><div><span className="inner-kicker">تعلّمت · الصف الثاني / 4</span><h1>السلوك والتحفيز</h1><p>تقييم سريع داخل الفصل والمدرسة</p></div><Link className="inner-home" href="/">الرئيسية</Link></header>
 <section className="inner-section"><div className="picker-block"><h2>اختر مكان الملاحظة</h2><div className="subject-choice-row"><button className={context==="classroom"?"active":""} onClick={()=>setContext("classroom")}>داخل الفصل</button><button className={context==="school"?"active":""} onClick={()=>setContext("school")}>داخل المدرسة</button><button disabled>المنزل · يقيّمه ولي الأمر</button></div></div><div className="picker-block"><h2>اختر السلوك</h2><div className="assessment-skill-grid">{shown.map(([id,title])=><button className={behaviorId===id?"active":""} key={id} onClick={()=>setBehaviorId(id)}><strong>{title}</strong></button>)}</div><button className="soft-action" onClick={()=>setShowAll(x=>!x)}>{showAll?"إخفاء الإضافية":"عرض جميع السلوكيات"}</button></div></section>
 {notice&&<div className="notice">{notice}</div>}<section className="inner-section"><div className="inner-section-head"><div><h2>{selected[1]}</h2><span>{context==="classroom"?"داخل الفصل":"داخل المدرسة"}</span></div><button className="btn" onClick={allGood}>تحديد الجميع: جيد ✓</button></div><div className="clean-eval-list">{students.map((s,i)=>{const value=current.get(s.id)??"good";return <article key={s.id}><span className="student-number">{i+1}</span><div className="eval-name"><h3>{s.name}</h3><small>{labels[value]}</small></div><div className="eval-choice">{(["excellent","good","needs_follow_up"] as BehaviorLevel[]).map(level=><button className={value===level?"active":""} key={level} onClick={()=>store.setBehaviorEvaluation(s.id,behaviorId,context,level)}>{labels[level]}</button>)}</div></article>})}</div></section>
 <section className="inner-section"><div className="inner-section-head"><h2>تقييم المنزل من ولي الأمر</h2><span>للعرض فقط</span></div><div className="week-compact-list">{store.messages.filter(x=>x.author==="guardian"&&x.body.startsWith("تقييم المنزل:")).slice(-8).map(x=><div className="week-compact-row" key={x.id}><b>{students.find(s=>s.id===x.studentId)?.name}</b><p>{x.body}</p></div>)}{!store.messages.some(x=>x.author==="guardian"&&x.body.startsWith("تقييم المنزل:"))&&<div className="empty-state compact-empty">لا توجد تقييمات منزلية بعد.</div>}</div></section>
 <footer className="site-credit">برمجة سلطان الصاعدي</footer></main>
}
