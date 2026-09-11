"use client";
import Image from "next/image";
import Link from "next/link";
import {academicWeek,getSchoolStatus} from "@/lib/schedule";
import {useTaallamt} from "@/lib/store";
import {TeacherBrandHeader,TeacherNav} from "@/components/TeacherChrome";

const subjectOrder=["لغتي","القرآن الكريم","الدراسات الإسلامية","الإملاء والخط"];
const subjectMeta:Record<string,{icon:string;line:string;tone:string}>={"لغتي":{icon:"/subject-icons/lughati.svg",line:"أقرأ · أفكر · أعبّر",tone:"blue"},"القرآن الكريم":{icon:"/subject-icons/quran.svg",line:"تلاوة · حفظ · إتقان",tone:"aqua"},"الدراسات الإسلامية":{icon:"/subject-icons/islamic.svg",line:"قيم · فقه · سلوك",tone:"indigo"},"الإملاء والخط":{icon:"/subject-icons/handwriting.svg",line:"كتابة صحيحة · خط أجمل",tone:"ice"}};
const levelLabel={mastered:"أتقن",partial:"في تقدم",needs_training:"يحتاج تدريبًا"} as const;

function shortDate(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("ar-SA",{day:"numeric",month:"short"}).format(date);
}

export default function TeacherHome(){
 const store=useTaallamt(),term=store.terms.find(item=>item.active)??store.terms[0],students=store.students.filter(item=>item.active),week=academicWeek();
 const subjects=store.subjects.filter(item=>item.enabled&&item.termId===term?.id&&subjectOrder.includes(item.name)).sort((a,b)=>subjectOrder.indexOf(a.name)-subjectOrder.indexOf(b.name));
 const weekSkills=store.skills.filter(item=>item.active&&item.termId===term?.id&&item.week===week);
 const pending=weekSkills.reduce((count,skill)=>count+students.filter(student=>!store.assessments.some(assessment=>assessment.studentId===student.id&&assessment.skillId===skill.id)).length,0);
 const trainingStudents=new Set(store.assessments.filter(item=>item.level==="needs_training").map(item=>item.studentId)).size,guardianReplies=store.messages.filter(item=>item.author==="guardian").length,status=getSchoolStatus();
 const currentPlan=store.weeklyPlans.find(plan=>plan.week===week&&plan.subjectId===subjects[0]?.id);
 const currentTermSkillIds=new Set(store.skills.filter(skill=>skill.termId===term?.id).map(skill=>skill.id));
 const recentAssessments=[...store.assessments].filter(item=>currentTermSkillIds.has(item.skillId)).sort((a,b)=>new Date(b.assessedAt).getTime()-new Date(a.assessedAt).getTime()).slice(0,3);
 const weekAssignments=store.resources.filter(item=>item.termId===term?.id&&item.week===week&&item.publishedToGuardian).slice(0,3);
 return <main className="ta-app ta-teacher-home">
  <TeacherBrandHeader/>
  <section className="ta-card ta-now-card"><div className="ta-section-title"><div><small>مركز العمل اليومي</small><h2>{status.current?.teaching?"حصتي الآن":"الحصة القادمة"}</h2></div><span className="ta-period-badge">{status.label}</span></div><div className="ta-now-content"><div><b>{currentPlan?.title??"خطة اليوم جاهزة من توزيع المنهج"}</b><p>{weekSkills.slice(0,2).map(skill=>skill.category).join(" · ")||"تظهر المهارات عند بداية الحصة"}</p></div></div></section>
  <section className="ta-card ta-summary"><div className="ta-section-title"><div><small>ما يحتاج اهتمامك</small><h2>ملخص اليوم</h2></div><span>الأسبوع {week}</span></div><div className="ta-summary-grid ta-summary-readonly"><div><strong>{pending}</strong><b>تقييمات مطلوبة</b></div><div><strong>{trainingStudents}</strong><b>تحتاج متابعة</b></div><div><strong>{guardianReplies}</strong><b>ردود أولياء الأمور</b></div></div></section>
  <section className="ta-card ta-subject-panel"><div className="ta-section-title"><div><small>الخطة الحالية من التوزيع المعتمد</small><h2>المواد الدراسية</h2></div><span>4 مواد</span></div><div className="ta-subject-grid">{subjects.map(subject=>{const meta=subjectMeta[subject.name],plan=store.weeklyPlans.find(item=>item.subjectId===subject.id&&item.week===week);return <div className={`ta-subject ${meta?.tone??"blue"}`} key={subject.id}><Image src={meta?.icon??"/guardian-icons/library.svg"} alt="" width={56} height={56}/><b>{subject.name}</b><span>{meta?.line}</span><small>{plan?.title??"لم تُحدد خطة هذا الأسبوع"}</small></div>})}</div></section>
  <section className="ta-card ta-recent-panel"><div className="ta-section-title"><div><small>آخر تحديثاتك المحفوظة</small><h2>آخر ما سجل المعلم</h2></div></div><div className="ta-recent-list">{recentAssessments.length?recentAssessments.map(item=>{const student=store.students.find(studentItem=>studentItem.id===item.studentId),skill=store.skills.find(skillItem=>skillItem.id===item.skillId);return <Link href={`/teacher/students/${item.studentId}/assessment`} key={item.id}><span className={`ta-result-dot ${item.level}`}>✓</span><div><b>{student?.name??"طالب"}</b><small>{skill?.title??"تقييم مهارة"}</small></div><strong>{levelLabel[item.level]}</strong><time>{shortDate(item.assessedAt)}</time></Link>}):<div className="ta-empty-line">لم تُسجّل تقييمات بعد هذا الفصل.</div>}</div></section>
  <section className="ta-card ta-homework-panel"><div className="ta-section-title"><div><small>المحتوى المنشور لولي الأمر</small><h2>واجبات هذا الأسبوع</h2></div></div><div className="ta-homework-list">{weekAssignments.length?weekAssignments.map(item=>{const subject=store.subjects.find(subjectItem=>subjectItem.id===item.subjectId);return <div className="ta-homework-static" key={item.id}><span>✎</span><div><b>{item.title}</b><small>{subject?.name??"المادة"} · {item.instructions}</small></div><em>منشور</em></div>}):<div className="ta-empty-line">لا يوجد واجب منشور لهذا الأسبوع.</div>}</div></section>
  <section className="ta-secondary-tools no-print" aria-label="أدوات إضافية"><Link href="/teacher/library">المكتبة</Link><Link href="/teacher/announcements">التواصل</Link><Link href="/teacher/portfolio">ملف إنجازي</Link><Link href="/teacher/settings">الإعدادات</Link></section>
  <footer className="site-credit">برمجة سلطان الصاعدي</footer><TeacherNav/>
 </main>
}
