"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { GuardianAccessManager } from "@/components/GuardianAccessManager";
import { PrintButton } from "@/components/PrintButton";
import { assessedSkills, latestAssessmentBySkill, remedialAction, skillsNeedingTraining } from "@/lib/assessment";
import { getTeacherContactRequests, getTeacherMessages, teacherSendMessage, type ContactRequestStatus } from "@/lib/teacher-api";
import { useTaallamt } from "@/lib/store";
import type { FollowUpCategory, MasteryLevel, Message, SpecialFollowUp } from "@/lib/types";

const masteryLabels: Record<MasteryLevel, string> = { mastered: "متقن", partial: "أتقن البعض", needs_training: "يحتاج تدريب" };
const categoryLabels: Record<FollowUpCategory, string> = { health: "حالة صحية مؤثرة على التعلم", learning: "صعوبة أو ضعف تعليمي", behavior: "متابعة سلوكية", family: "ظرف أسري مؤثر", other: "متابعة أخرى" };

function suggestedPlan(category: FollowUpCategory) {
  if (category === "health") return ["تطبيق التكييفات المدرسية المعتمدة من ولي الأمر أو المختص فقط.", "تقليل الإجهاد وتقسيم المهمة عند الحاجة.", "مراجعة أثر الحالة على التعلم والتواصل مع الجهة المختصة في المدرسة دون تشخيص طبي."];
  if (category === "behavior") return ["تحديد سلوك واحد قابل للملاحظة كهدف قصير.", "تعزيز السلوك الإيجابي مباشرة وبشكل ثابت.", "تسجيل المواقف المؤثرة ومراجعة التقدم أسبوعيًا."];
  if (category === "family") return ["حماية خصوصية الطالب وعدم تداول التفاصيل خارج الحاجة التعليمية.", "تخفيف العبء عند الضرورة مع إبقاء روتين واضح.", "تواصل مختصر ومنتظم مع ولي الأمر ومراجعة الأثر الدراسي."];
  if (category === "other") return ["تحديد الهدف المتوقع بوضوح.", "اختيار إجراء بسيط قابل للقياس لمدة أسبوع.", "مراجعة النتيجة وتعديل الخطة عند الحاجة."];
  return ["تدريب قصير يومي على المهارة المستهدفة.", "تقسيم المهمة إلى خطوات صغيرة مع تكرار متعدد الحواس.", "مراجعة التقدم أسبوعيًا مع ولي الأمر وتعديل الخطة حسب النتيجة."];
}

export default function StudentPage() {
  const params = useParams<{ id: string }>();
  const store = useTaallamt();
  const student = store.students.find((item) => item.id === params.id);
  const current = student ? store.followUps[student.id] : undefined;
  const [category, setCategory] = useState<FollowUpCategory>(current?.category ?? "learning");
  const [impact, setImpact] = useState(current?.schoolImpact ?? "");
  const [goal, setGoal] = useState(current?.goal ?? "");
  const [review, setReview] = useState(current?.nextReviewAt ?? "بعد أسبوعين");
  const [status, setStatus] = useState<SpecialFollowUp["status"]>(current?.status ?? "needs_review");
  const [teacherMessage, setTeacherMessage] = useState("");
  const [remoteMessages, setRemoteMessages] = useState<Message[]>([]);
  const [messagesReady, setMessagesReady] = useState(false);
  const [contactStatus, setContactStatus] = useState<ContactRequestStatus>("closed");
  const [messageNotice, setMessageNotice] = useState("");
  const [summonsDate,setSummonsDate]=useState("");
  const [summonsTime,setSummonsTime]=useState("");
  const [summonsReason,setSummonsReason]=useState("مناقشة مستوى الطالب");
  const [summonsMode,setSummonsMode]=useState("حضوري");
  const [summonsSent,setSummonsSent]=useState(false);
  const [shareStatus,setShareStatus]=useState("");
  const plan = useMemo(() => current?.plan?.length ? current.plan : suggestedPlan(category), [current?.plan, category]);

  useEffect(() => {
    const id = student?.id;
    if (!id) return;
    let alive = true;
    Promise.all([getTeacherMessages(id), getTeacherContactRequests()])
      .then(([messageData, contactData]) => {
        if (!alive) return;
        setRemoteMessages(messageData.messages);
        setMessagesReady(true);
        setContactStatus(contactData.requests.find((item) => item.studentId === id)?.status ?? "closed");
      })
      .catch(() => {
        if (alive) {
          setMessagesReady(false);
          setMessageNotice("تعذر تحميل المحادثة من الخادم الآن.");
        }
      });
    return () => { alive = false; };
  }, [student?.id]);

  if (!student) return <main className="shell"><div className="notice warn">الطالب غير موجود أو تم حذفه.</div><Link className="btn section" href="/teacher/students">العودة للطلاب</Link></main>;

  const studentId = student.id;
  const studentName = student.name;
  const studentClassName = student.className;
  const activeSubjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId).sort((a, b) => a.order - b.order);
  const activeSkills = store.skills.filter((skill) => skill.active && skill.termId === store.activeTermId);
  const latest = latestAssessmentBySkill(store.assessments, studentId);
  const assessed = assessedSkills(activeSkills, store.assessments, studentId, store.activeTermId);
  const needsSkills = skillsNeedingTraining(activeSkills, store.assessments, studentId, store.activeTermId);
  const masteredCount = assessed.filter(({ assessment }) => assessment.level === "mastered").length;
  const studentMessages = messagesReady ? remoteMessages : store.messages.filter((message) => message.studentId === studentId);

  function saveSpecial() {
    store.saveFollowUp({ studentId, category, guardianStatement: current?.guardianStatement ?? "", schoolImpact: impact, goal, plan: suggestedPlan(category), status, nextReviewAt: review, guardianVisible: true });
    alert("تم حفظ ملف المتابعة الخاصة");
  }

  async function sendTeacherMessage(event: FormEvent) {
    event.preventDefault();
    if (!teacherMessage.trim()) return;
    if (contactStatus !== "approved") {
      setMessageNotice("المحادثة مغلقة. افتح التواصل من صفحة «التواصل» بعد طلب ولي الأمر.");
      return;
    }
    setMessageNotice("");
    try {
      await teacherSendMessage(studentId, teacherMessage.trim());
      setTeacherMessage("");
      const fresh = await getTeacherMessages(studentId);
      setRemoteMessages(fresh.messages);
      setMessagesReady(true);
      setMessageNotice("تم إرسال الرسالة.");
    } catch (error) {
      const code = (error as { payload?: { error?: string } })?.payload?.error;
      setMessageNotice(code === "CONTACT_NOT_APPROVED" ? "المحادثة ليست معتمدة حاليًا." : "تعذر إرسال الرسالة الآن.");
    }
  }

  function sendSummons(){
    if(!summonsDate||!summonsTime)return;
    store.sendMessage(studentId,"teacher",`استدعاء ولي أمر | الموعد: ${summonsDate} ${summonsTime} | الطريقة: ${summonsMode} | السبب: ${summonsReason}`);
    setSummonsSent(true);
  }

  async function shareReferral(recipient: "المرشد الطلابي" | "الوكيل") {
    const progressLabel = status === "improving" ? "يتحسن" : status === "stable" ? "مستقر" : "يحتاج مراجعة";
    const text = [
      `إلى ${recipient} المحترم،`,
      `أرفع لكم ملخص متابعة الطالب: ${studentName}`,
      `الصف والفصل: ${studentClassName}`,
      `نوع المتابعة: ${categoryLabels[category]}`,
      `حالة التقدم: ${progressLabel}`,
      impact ? `الأثر على التعلم: ${impact}` : "",
      goal ? `الهدف الحالي: ${goal}` : "",
      `موعد المراجعة: ${review || "غير محدد"}`,
      needsSkills.length ? `عدد المهارات التي تحتاج تدريبًا: ${needsSkills.length}` : "",
      "يرجى الاطلاع والتوجيه بما ترونه مناسبًا وفق الإجراءات المدرسية.",
      "المعلم: سلطان الصاعدي",
      "مدرسة عمرو بن أوس الثقفي",
    ].filter(Boolean).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `متابعة الطالب ${studentName}`, text });
        setShareStatus(`تم فتح خيارات الإرسال إلى ${recipient}.`);
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus(`تم نسخ النص الجاهز لـ${recipient}.`);
      }
    } catch {
      setShareStatus("لم يتم الإرسال. يمكنك المحاولة مرة أخرى دون فقد بيانات المتابعة.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar"><div className="brand"><div className="logo">🧒</div><div><h1>{studentName}</h1><p>{studentClassName} · سجل الطالب</p></div></div><div className="mini-actions"><PrintButton label="طباعة سجل الطالب" /><Link className="btn secondary no-print" href="/teacher/students">الطلاب</Link></div></header>

      <section className="two">
        <GuardianAccessManager studentId={studentId} />
        <div className="card"><h3>ملخص المهارات</h3><div className="kv"><span>مقيّمة</span><b>{assessed.length}</b></div><div className="kv"><span>متقنة</span><b>{masteredCount}</b></div><div className="kv"><span>تحتاج تدريبًا</span><b>{needsSkills.length}</b></div><div className="kv"><span>متابعة خاصة</span><span>{student.specialFollowUp ? "مفعلة" : "غير مفعلة"}</span></div><div className="mini-actions section no-print"><Link className="btn" href={`/guardian?student=${encodeURIComponent(studentId)}`}>فتح صفحة الطالب</Link><Link className="btn secondary" href={`/teacher/students/${studentId}/portfolio`}>ملف الإنجاز</Link></div></div>
      </section>

      <section className="section">
        <div className="section-head"><h2>سجل متابعة المهارات</h2><Link className="btn no-print" href="/teacher/assessment">فتح شاشة التقييم</Link></div>
        <div className="card">
          {assessed.length === 0 ? <div className="notice">لم تُسجل تقييمات مهارية لهذا الطالب بعد. ابدأ من شاشة «سجل متابعة المهارات».</div> : <div className="list">{activeSubjects.map((subject) => {
            const rows = activeSkills.filter((skill) => skill.subjectId === subject.id && latest.has(skill.id));
            if (!rows.length) return null;
            return <div key={subject.id}><h3 className="section">{subject.name}</h3>{rows.map((skill) => { const assessment = latest.get(skill.id)!; return <div className="row" key={skill.id}><div className="grow"><h4>{skill.title}</h4><small>{skill.category} · الأسبوع {skill.week}</small></div><span className={`badge ${assessment.level === "needs_training" ? "warn" : ""}`}>{masteryLabels[assessment.level]}</span></div>; })}</div>;
          })}</div>}
        </div>
      </section>

      <section className="section"><div className="section-head"><h2>الخطة العلاجية المبنية على المهارات</h2><span className={`badge ${needsSkills.length ? "warn" : ""}`}>{needsSkills.length} مهارة</span></div><div className="card">{needsSkills.length ? <div className="list">{needsSkills.map((skill) => { const subject = activeSubjects.find((item) => item.id === skill.subjectId); return <div className="row" key={skill.id}><div><h4>{subject?.name ?? "المادة"} — {skill.category}</h4><small><b>{skill.title}</b><br />{remedialAction(skill)}</small></div><span className="badge warn">يحتاج تدريب</span></div>; })}</div> : <div className="notice">لا توجد مهارة مصنفة «يحتاج تدريب» في آخر تقييم مسجل. تستمر المراجعة العادية حسب الخطة الأسبوعية.</div>}</div></section>

      <section className="section">
        <div className="section-head"><h2>ملف المتابعة الخاصة</h2><span className="badge red">خاص</span></div>
        <div className="card">
          {current?.guardianStatement && <div className="notice warn"><b>ما ذكره ولي الأمر:</b><br />{current.guardianStatement}</div>}
          <div className="two section no-print"><label className="stack">نوع المتابعة<select className="field" value={category} onChange={(e) => setCategory(e.target.value as FollowUpCategory)}>{Object.entries(categoryLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="stack">حالة التقدم<select className="field" value={status} onChange={(e) => setStatus(e.target.value as SpecialFollowUp["status"])}><option value="improving">يتحسن</option><option value="stable">مستقر</option><option value="needs_review">يحتاج مراجعة</option></select></label></div>
          <label className="stack section no-print">موعد المراجعة<input className="field" value={review} onChange={(e) => setReview(e.target.value)} /></label>
          <label className="stack section no-print">الأثر على التعلم<textarea className="field textarea" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="مثال: يتعب سريعًا في القراءة أو يحتاج وقتًا أطول..." /></label>
          <label className="stack section no-print">الهدف<textarea className="field textarea" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="هدف واضح يمكن مراجعته بعد مدة محددة" /></label>
          <h3 className="section">إجراءات مدرسية مقترحة</h3><ul>{plan.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul>
          {status === "needs_review" && <div className="notice warn">إذا لم يظهر تحسن بعد مدة المتابعة، راجع الخطة وغيّر التدخل أو أحل الحالة للمرشد/الجهة المختصة بحسب طبيعتها.</div>}
          <div className="notice warn section">الاقتراحات تعليمية ومدرسية فقط. لا يشخّص النظام حالة صحية ولا يقدم علاجًا طبيًا.</div><button className="btn section no-print" onClick={saveSpecial}>حفظ المتابعة الخاصة</button>
        </div>
      </section>

      <section className="section no-print staff-referral">
        <div className="section-head"><div><h2>الإحالة والتنسيق المدرسي</h2><p>نص جاهز من بيانات المتابعة الحالية دون إعادة الكتابة</p></div><span className="badge">مدرسي</span></div>
        <div className="card"><p>اختر الجهة، وسيجهز النظام ملخص الطالب الحالي ويفتح خيارات المشاركة في الجوال.</p><div className="mini-actions section"><button className="btn" type="button" onClick={() => void shareReferral("المرشد الطلابي")}>إرسال للمرشد الطلابي</button><button className="btn secondary" type="button" onClick={() => void shareReferral("الوكيل")}>إرسال للوكيل</button></div>{shareStatus && <div className="notice section" role="status">{shareStatus}</div>}</div>
      </section>

      <section className="section no-print"><div className="section-head"><div><h2>التواصل مع ولي الأمر</h2><p>يفتح فقط بعد موافقتك على طلب التواصل.</p></div><span className={`badge ${contactStatus === "pending" ? "warn" : ""}`}>{contactStatus === "approved" ? `مفتوح · ${studentMessages.length} رسالة` : contactStatus === "pending" ? "طلب بانتظار قرارك" : "مغلق"}</span></div><div className="card"><div className="list">{studentMessages.slice(-6).map((message) => <div className="row" key={message.id}><div><h4>{message.author === "teacher" ? "المعلم" : "ولي الأمر"}</h4><small>{message.body}</small></div></div>)}{studentMessages.length === 0 && <div className="notice">لا توجد رسائل بعد.</div>}</div>{contactStatus === "approved" ? <form className="toolbar section" onSubmit={sendTeacherMessage}><input className="field grow" required value={teacherMessage} onChange={(e) => setTeacherMessage(e.target.value)} placeholder="اكتب ردًا لولي الأمر" /><button className="btn" type="submit">إرسال</button></form> : <div className="notice warn section">المحادثة مغلقة. افتح «التواصل» لمراجعة طلب ولي الأمر والموافقة عليه أو رفضه.</div>}{messageNotice && <div className="notice section" role="status">{messageNotice}</div>}</div></section>
      <section className="section summons-section"><div className="section-head"><div><h2>استدعاء ولي أمر</h2><p>إنشاء وطباعة وإرسال الاستدعاء من ملف الطالب</p></div><span className="badge red">رسمي</span></div><div className="card summons-controls no-print"><div className="toolbar"><label>التاريخ<input className="field" type="date" value={summonsDate} onChange={e=>setSummonsDate(e.target.value)}/></label><label>الوقت<input className="field" type="time" value={summonsTime} onChange={e=>setSummonsTime(e.target.value)}/></label><label>طريقة اللقاء<select className="field" value={summonsMode} onChange={e=>setSummonsMode(e.target.value)}><option>حضوري</option><option>اتصال</option></select></label></div><label className="stack">السبب<select className="field" value={summonsReason} onChange={e=>setSummonsReason(e.target.value)}><option>المستوى الدراسي</option><option>متابعة المهارات</option><option>الخطة العلاجية</option><option>السلوك</option><option>عدم إنجاز المهام</option><option>مناقشة مستوى الطالب</option><option>سبب آخر</option></select></label><div className="toolbar"><button className="btn" disabled={!summonsDate||!summonsTime} onClick={sendSummons}>إرسال لولي الأمر</button><PrintButton label="طباعة / حفظ PDF"/></div>{summonsSent&&<div className="notice">تم إرسال الاستدعاء وتسجيله داخل ملف الطالب.</div>}</div><article className="summons-paper"><h1>استدعاء ولي أمر</h1><p>يسر مدرسة الطالب دعوتكم لمتابعة مستواه وتعزيز الشراكة بين الأسرة والمدرسة.</p><div className="kv"><span>اسم الطالب</span><b>{studentName}</b></div><div className="kv"><span>الصف والفصل</span><b>{studentClassName}</b></div><div className="kv"><span>الموعد</span><b>{summonsDate ? `${summonsDate}${summonsTime ? ` ${summonsTime}` : ""}` : ""}</b></div><div className="kv"><span>طريقة اللقاء</span><b>{summonsMode}</b></div><div className="kv"><span>السبب</span><b>{summonsReason}</b></div><div className="summons-sign"><span>المعلم: سلطان الصاعدي</span><span>توقيع ولي الأمر: ______________</span></div></article></section>
    </main>
  );
}
