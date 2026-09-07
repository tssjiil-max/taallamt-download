import { PrintButton } from "@/components/PrintButton";
import { specialFollowUp, students, subjects } from "@/lib/sample-data";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = students.find((item) => item.id === id) ?? students[0];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🧒</div><div><h1>{student.name}</h1><p>{student.className} · سجل الطالب</p></div></div>
        <div className="mini-actions"><PrintButton label="طباعة سجل الطالب" /><button className="btn no-print">تقييم سريع</button></div>
      </header>

      <div className="tabs no-print">
        <button className="tab active">نظرة عامة</button>
        <button className="tab">المهارات</button>
        <button className="tab">الواجبات</button>
        <button className="tab">التحفيز</button>
        <button className="tab">الخطة العلاجية</button>
        {student.specialFollowUp && <button className="tab">متابعة خاصة</button>}
      </div>

      <section className="two">
        <div className="card">
          <h3>المستوى العام</h3>
          <div className="kv"><span>التقييم</span><b>أتقن البعض</b></div>
          <div className="kv"><span>ولي الأمر</span><span>جهازان مسموحان</span></div>
          <div className="kv"><span>الأجهزة</span><span>{student.guardianDevices}/{student.guardianDeviceLimit}</span></div>
          <div className="mini-actions no-print" style={{ marginTop: 12 }}><button className="btn secondary">إلغاء جهاز</button><button className="btn">فتح بوابة الولي</button></div>
        </div>
        <div className="card">
          <h3>المواد الحالية</h3>
          {subjects.map((subject) => <div className="kv" key={subject.id}><span>{subject.name}</span><span>متابعة المهارات والتقييم</span></div>)}
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>المهارات التي تحتاج تدريبًا</h2></div>
        <div className="list">
          <div className="row"><div className="row-main"><div className="avatar">📘</div><div><h4>قراءة الكلمات الجديدة بطلاقة</h4><small>لغتي</small></div></div><span className="badge warn">يحتاج تدريب</span></div>
          <div className="row"><div className="row-main"><div className="avatar">✍️</div><div><h4>إملاء الكلمات المستهدفة</h4><small>لغتي · الإملاء داخل المادة</small></div></div><span className="badge warn">أتقن البعض</span></div>
        </div>
      </section>

      {student.specialFollowUp && (
        <section className="section">
          <div className="section-head"><h2>ملف المتابعة الخاصة</h2><span className="badge red">خاص</span></div>
          <div className="card">
            <div className="kv"><span>ما ذكره الولي</span><span>{specialFollowUp.guardianStatement}</span></div>
            <div className="kv"><span>الأثر الدراسي</span><span>{specialFollowUp.schoolImpact}</span></div>
            <div className="kv"><span>الهدف</span><span>{specialFollowUp.goal}</span></div>
            <div className="kv"><span>المراجعة</span><span>{specialFollowUp.nextReviewAt}</span></div>
            <h3 style={{ marginTop: 16 }}>الخطة المقترحة</h3>
            <ul>{specialFollowUp.plan.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul>
            <div className="notice warn">النظام يقترح تكييفات ومتابعة مدرسية فقط، ولا يقدم تشخيصًا أو علاجًا طبيًا.</div>
          </div>
        </section>
      )}
    </main>
  );
}
