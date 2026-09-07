"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PrintButton } from "@/components/PrintButton";
import { useTaallamt } from "@/lib/store";
import type { FollowUpCategory, MasteryLevel, SpecialFollowUp } from "@/lib/types";

const masteryLabels: Record<MasteryLevel, string> = {
  mastered: "متقن",
  partial: "أتقن البعض",
  needs_training: "يحتاج تدريب",
};

const categoryLabels: Record<FollowUpCategory, string> = {
  health: "حالة صحية مؤثرة على التعلم",
  learning: "صعوبة أو ضعف تعليمي",
  behavior: "متابعة سلوكية",
  family: "ظرف أسري مؤثر",
  other: "متابعة أخرى",
};

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
  const plan = useMemo(() => current?.plan?.length ? current.plan : suggestedPlan(category), [current?.plan, category]);

  if (!student) return <main className="shell"><div className="notice warn">الطالب غير موجود أو تم حذفه.</div><Link className="btn section" href="/teacher/students">العودة للطلاب</Link></main>;

  const activeSubjects = store.subjects.filter((subject) => subject.enabled && subject.termId === store.activeTermId);
  const needsTraining = activeSubjects.filter((subject) => student.subjectLevels[subject.id] === "needs_training");

  function saveSpecial() {
    const followUp: SpecialFollowUp = {
      studentId: student!.id,
      category,
      guardianStatement: current?.guardianStatement ?? "",
      schoolImpact: impact,
      goal,
      plan: suggestedPlan(category),
      status: current?.status ?? "needs_review",
      nextReviewAt: review,
      guardianVisible: true,
    };
    store.saveFollowUp(followUp);
    alert("تم حفظ ملف المتابعة الخاصة");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🧒</div><div><h1>{student.name}</h1><p>{student.className} · سجل الطالب</p></div></div>
        <div className="mini-actions"><PrintButton label="طباعة سجل الطالب" /><Link className="btn secondary no-print" href="/teacher/students">الطلاب</Link></div>
      </header>

      <section className="two">
        <div className="card">
          <h3>الوصول والمتابعة</h3>
          <div className="kv"><span>الحالة</span><b>{student.active ? "طالب حالي" : "مؤرشف"}</b></div>
          <div className="kv"><span>ولي الأمر</span><span>مسموح جهازان في الوقت نفسه</span></div>
          <div className="kv"><span>الأجهزة</span><span>{student.guardianDevices}/{student.guardianDeviceLimit}</span></div>
          <div className="mini-actions no-print" style={{ marginTop: 12 }}><button className="btn secondary" onClick={() => store.setGuardianDevices(student.id, 0)}>إلغاء الأجهزة</button><Link className="btn" href="/guardian">معاينة بوابة الولي</Link></div>
        </div>
        <div className="card">
          <h3>ملخص التقييم</h3>
          <div className="kv"><span>المواد</span><span>{activeSubjects.length}</span></div>
          <div className="kv"><span>تحتاج تدريبًا</span><b>{needsTraining.length}</b></div>
          <div className="kv"><span>متابعة خاصة</span><span>{student.specialFollowUp ? "مفعلة" : "غير مفعلة"}</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>تقييم المواد والمهارات العامة</h2></div>
        <div className="list">
          {activeSubjects.map((subject) => {
            const value = student.subjectLevels[subject.id] ?? "partial";
            return <div className="row" key={subject.id}><div><h4>{subject.name}</h4><small>يمكن لاحقًا تفصيل التقييم إلى مهارات الدرس نفسها</small></div><select className="field no-print" value={value} onChange={(e) => store.setMastery(student.id, subject.id, e.target.value as MasteryLevel)}><option value="mastered">متقن</option><option value="partial">أتقن البعض</option><option value="needs_training">يحتاج تدريب</option></select><span className={`badge ${value === "needs_training" ? "warn" : ""}`}>{masteryLabels[value]}</span></div>;
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>الخطة العلاجية</h2></div>
        <div className="card">
          {needsTraining.length ? <><p>المواد التي تحتاج تدخلًا حاليًا: <b>{needsTraining.map((s) => s.name).join("، ")}</b></p><div className="notice section">الخطة التفصيلية ستُبنى على المهارات غير المتقنة من توزيع كل مادة، وتظهر لولي الأمر جاهزة للطباعة.</div></> : <div className="notice">لا توجد مادة مصنفة «يحتاج تدريب» حاليًا.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>ملف المتابعة الخاصة</h2><span className="badge red">خاص</span></div>
        <div className="card">
          {current?.guardianStatement && <div className="notice warn"><b>ما ذكره ولي الأمر:</b><br />{current.guardianStatement}</div>}
          <div className="two section no-print">
            <label>نوع المتابعة<select className="field" value={category} onChange={(e) => setCategory(e.target.value as FollowUpCategory)}>{Object.entries(categoryLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            <label>موعد المراجعة<input className="field" value={review} onChange={(e) => setReview(e.target.value)} /></label>
          </div>
          <label className="stack section no-print">الأثر على التعلم<textarea className="field textarea" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="مثال: يتعب سريعًا في القراءة أو يحتاج وقتًا أطول..." /></label>
          <label className="stack section no-print">الهدف<textarea className="field textarea" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="هدف واضح يمكن مراجعته بعد مدة محددة" /></label>
          <h3 className="section">إجراءات مدرسية مقترحة</h3>
          <ul>{plan.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul>
          <div className="notice warn">الاقتراحات هنا تعليمية ومدرسية فقط. لا يشخّص النظام أي حالة صحية ولا يقدم علاجًا طبيًا، وعند الحاجة تكون الإحالة لمختص أو الجهة المدرسية المعنية.</div>
          <button className="btn section no-print" onClick={saveSpecial}>حفظ المتابعة الخاصة</button>
        </div>
      </section>
    </main>
  );
}
