"use client";
import Image from "next/image";
import Link from "next/link";
import {academicWeek,getSchoolStatus} from "@/lib/schedule";
import {useTaallamt} from "@/lib/store";
import {TeacherBrandHeader,TeacherNav} from "@/components/TeacherChrome";

const subjectOrder=["لغتي","القرآن الكريم","الدراسات الإسلامية","الإملاء والخط"];
const subjectMeta:Record<string,{icon:string;line:string;tone:string}>={"لغتي":{icon:"/guardian-icons/lughati.svg",line:"أقرأ · أفكر · أعبّر",tone:"blue"},"القرآن الكريم":{icon:"/guardian-icons/quran.svg",line:"تلاوة · حفظ · إتقان",tone:"aqua"},"الدراسات الإسلامية":{icon:"/guardian-icons/islamic.svg",line:"قيم · فقه · سلوك",tone:"indigo"},"الإملاء والخط":{icon:"/guardian-icons/message.svg",line:"كتابة صحيحة · خط أجمل",tone:"ice"}};

export default function TeacherHome(){
 const store=useTaallamt(),term=store.terms.find(item=>item.active)??store.terms[0],students=store.students.filter(item=>item.active),week=academicWeek();
 const subjects=store.subjects.filter(item=>item.enabled&&item.termId===term?.id&&subjectOrder.includes(item.name)).sort((a,b)=>subjectOrder.indexOf(a.name)-subjectOrder.indexOf(b.name));
 const weekSkills=store.skills.filter(item=>item.active&&item.termId===term?.id&&item.week===week);
 const pending=weekSkills.reduce((count,skill)=>count+students.filter(student=>!store.assessments.some(assessment=>assessment.studentId===student.id&&assessment.skillId===skill.id)).length,0);
 const trainingStudents=new Set(store.assessments.filter(item=>item.level==="needs_training").map(item=>item.studentId)).size,guardianReplies=store.messages.filter(item=>item.author==="guardian").length,status=getSchoolStatus();
 const currentPlan=store.weeklyPlans.find(plan=>plan.week===week&&plan.subjectId===subjects[0]?.id);
 return <main className="ta-app ta-teacher-home">
  <TeacherBrandHeader/>
  <section className="ta-card ta-now-card"><div className="ta-section-title"><div><small>مركز العمل اليومي</small><h2>{status.current?.teaching?"حصتي الآن":"الحصة القادمة"}</h2></div><span className="ta-period-badge">{status.label}</span></div><div className="ta-now-content"><div><b>{currentPlan?.title??"خطة اليوم جاهزة من توزيع المنهج"}</b><p>{weekSkills.slice(0,2).map(skill=>skill.category).join(" · ")||"تظهر المهارات عند بداية الحصة"}</p></div><Link href="/teacher/assessment">ابدأ الحصة</Link></div></section>
  <section className="ta-card ta-summary"><div className="ta-section-title"><div><small>ما يحتاج اهتمامك</small><h2>ملخص اليوم</h2></div><span>الأسبوع {week}</span></div><div className="ta-summary-grid"><Link href="/teacher/assessment"><strong>{pending}</strong><b>تقييمات مطلوبة</b></Link><Link href="/teacher/students"><strong>{trainingStudents}</strong><b>تحتاج متابعة</b></Link><Link href="/teacher/announcements"><strong>{guardianReplies}</strong><b>ردود أولياء الأمور</b></Link></div></section>
  <section className="ta-card ta-subject-panel"><div className="ta-section-title"><div><small>اختر المادة لبدء التقييم والمتابعة</small><h2>المواد والمهارات</h2></div><span>4 مواد</span></div><div className="ta-subject-grid">{subjects.map(subject=>{const meta=subjectMeta[subject.name],plan=store.weeklyPlans.find(item=>item.subjectId===subject.id&&item.week===week);return <Link className={`ta-subject ${meta?.tone??"blue"}`} href={`/teacher/subject/${subject.id}`} key={subject.id}><Image src={meta?.icon??"/guardian-icons/library.svg"} alt="" width={72} height={72}/><b>{subject.name}</b><span>{meta?.line}</span><small>{plan?.title??"لم تُحدد خطة هذا الأسبوع"}</small></Link>})}</div></section>
  <Link className="ta-quick-assessment" href="/teacher/assessment"><Image src="/guardian-icons/followup.svg" alt="" width={82} height={82}/><div><small>أسرع إجراء أثناء الحصة</small><h2>التقييم السريع</h2><p>حدد «أتقن» للجميع ثم عدّل من يحتاج تدريبًا</p></div><span>‹</span></Link>
  <section className="ta-action-grid"><Link href="/teacher/students"><Image src="/guardian-icons/message.svg" alt="" width={58} height={58}/><div><b>الطلاب</b><span>الملفات والمتابعة</span></div></Link><Link href="/teacher/values"><Image src="/guardian-icons/trophy.svg" alt="" width={58} height={58}/><div><b>السلوك والتحفيز</b><span>الفصل · المدرسة · المنزل</span></div></Link><Link href="/teacher/library"><Image src="/guardian-icons/library.svg" alt="" width={58} height={58}/><div><b>المكتبة</b><span>ملفات خاصة وعامة</span></div></Link><Link href="/teacher/announcements"><Image src="/guardian-icons/message.svg" alt="" width={58} height={58}/><div><b>التواصل</b><span>الإعلانات وطلبات التواصل</span></div></Link></section>
  <section className="ta-mini-actions"><Link href="/teacher/portfolio"><b>ملف إنجازي</b><span>يجمع أعمالك تلقائيًا</span></Link><Link href="/teacher/reports"><b>التقارير</b><span>نتائج وملخصات</span></Link><Link href="/teacher/settings"><b>الإعدادات</b><span>الفصل والجدول والدوام</span></Link></section>
  <footer className="site-credit">برمجة سلطان الصاعدي</footer><TeacherNav/>
 </main>
}
