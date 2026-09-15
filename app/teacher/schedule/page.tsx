"use client";

import Link from "next/link";
import { DateBar } from "@/components/DateBar";
import { useTaallamt } from "@/lib/store";
import { academicWeek, plansForWeek } from "@/lib/schedule";
import { useEffect, useState } from "react";

const defaultTimes = ["٧:٠٠–٧:١٥ الطابور","٧:١٥–٨:٠٠ الأولى","٨:٠٠–٨:٤٥ الثانية","٨:٤٥–٩:٣٠ الثالثة","٩:٣٠–٩:٥٠ الفسحة","٩:٥٠–١٠:٣٠ الرابعة","١٠:٣٠–١١:١٠ الخامسة","١١:١٠–١١:٥٠ السادسة","١١:٥٠–١٢:٣٠ السابعة","١٢:٣٠–١٢:٥٠ الصلاة"];

export default function SchedulePage() {
  const store = useTaallamt();
  const week = academicWeek();
  const plans = plansForWeek(store.weeklyPlans, week);
  const [times,setTimes]=useState(defaultTimes);
  useEffect(()=>{const saved=localStorage.getItem("taallamt-school-times");if(saved)setTimes(JSON.parse(saved));},[]);
  function saveTimes(){localStorage.setItem("taallamt-school-times",JSON.stringify(times));alert("تم حفظ أوقات الدوام");}

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🗓️</div><div><h1>الخطة والنشر الآلي</h1><p>التوزيع المعتمد ومصدر الأتمتة الذي يظهر في صفحة الطالب</p></div></div>
        <Link className="btn secondary no-print" href="/">لوحة المعلم</Link>
      </header>
      <DateBar />

      <section className="hero section">
        <div><h2>الأسبوع {week}</h2><p>يستمد محرك الأتمتة الخطة والواجبات من التوزيع والمهارات وجدول الحصص، ولا ينشئ محتوى بديلًا عند نقص البيانات.</p></div>
        <div className="hero-stats"><div className="stat"><b>{plans.length}</b><span>مواد لها توزيع</span></div><div className="stat"><b>3</b><span>حد الواجب اليومي</span></div><div className="stat"><b>الرياض</b><span>التوقيت المعتمد</span></div><div className="stat"><b>تلقائي</b><span>النشر من الخادم</span></div></div>
      </section>

      <section className="section">
        <div className="section-head"><h2>أوقات الدوام القابلة للتعديل</h2><button className="btn no-print" onClick={saveTimes}>حفظ</button></div>
        <div className="grid">{times.map((value,index)=><label className="card stack" key={index}><b>الفترة {index+1}</b><input className="field" value={value} onChange={e=>setTimes(times.map((item,i)=>i===index?e.target.value:item))}/></label>)}</div>
      </section>

      <section className="section">
        <div className="section-head"><h2>توزيع الأسبوع</h2></div>
        <div className="grid">
          {plans.map((plan) => {
            const subject = store.subjects.find((s) => s.id === plan.subjectId);
            return <div className="card" key={plan.id}><h3>{subject?.name ?? plan.subjectId}</h3><p>{plan.title}</p></div>;
          })}
        </div>
      </section>

      <section className="section"><div className="notice">التقسيم اليومي، الحفظ، المهارات وواجبات الطالب تُحسب في محرك الأتمتة المركزي وتظهر في قسم «الخطة والواجبات» في الصفحة الرئيسية للمعلم، وفي «مهامي اليوم» داخل صفحة الطالب.</div></section>
    </main>
  );
}
