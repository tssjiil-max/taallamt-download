"use client";
import Link from "next/link";
import {FormEvent,useMemo,useState} from "react";
import {useTaallamt} from "@/lib/store";
export default function StudentsPage(){
 const {students,addStudent}=useTaallamt(); const [query,setQuery]=useState(""); const [newName,setNewName]=useState(""); const [filter,setFilter]=useState<"active"|"special">("active");
 const shown=useMemo(()=>students.filter(s=>s.active&&s.name.includes(query.trim())&&(filter!=="special"||s.specialFollowUp)),[students,query,filter]);
 function submit(e:FormEvent){e.preventDefault();if(!newName.trim())return;addStudent(newName);setNewName("")}
 return <main className="shell inner-shell"><header className="inner-hero"><div><span className="inner-kicker">تعلّمت · الصف الثاني / 4</span><h1>طلاب الفصل</h1><p>ملخص الطالب أولًا، والتفاصيل عند فتح ملفه.</p></div><Link className="inner-home" href="/">الرئيسية</Link></header>
 <section className="inner-panel no-print"><form className="student-add" onSubmit={submit}><input className="field" value={newName} onChange={e=>setNewName(e.target.value)} placeholder="اسم الطالب الجديد"/><button className="btn" type="submit">إضافة طالب</button><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="البحث عن طالب..."/></form><div className="segmented"><button className={filter==="active"?"active":""} onClick={()=>setFilter("active")} type="button">كل الطلاب</button><button className={filter==="special"?"active":""} onClick={()=>setFilter("special")} type="button">يحتاج متابعة</button></div></section>
 <section className="student-roster">{shown.map((s,i)=><Link className="student-summary-card" href={`/teacher/students/${s.id}`} key={s.id}><span className="student-number">{i+1}</span><div className="student-summary-copy"><h3>{s.name}</h3><p>{s.className}</p><small>{s.specialFollowUp?"يحتاج متابعة خاصة":"فتح التقييم والمتابعة"}</small></div><span className="student-open">عرض</span></Link>)}{!shown.length&&<div className="empty-state">لا توجد نتائج.</div>}</section><footer className="site-credit">برمجة سلطان الصاعدي</footer></main>}
