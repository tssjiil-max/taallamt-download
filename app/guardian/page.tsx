import { PrintButton } from "@/components/PrintButton";

export default function GuardianPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">🏠</div><div><h1>متابعة الطالب</h1><p>بوابة ولي الأمر — متابعة وتواصل</p></div></div>
        <span className="pill no-print">الجهاز 1 من 2</span>
      </header>

      <section className="hero">
        <div><h2>نموذج طالب 1</h2><p>هنا يشاهد ولي الأمر مستوى ابنه فقط، والمهام والخطة العلاجية والتنبيهات والتواصل مع المعلم.</p></div>
        <div className="hero-stats"><div className="stat"><b>⭐</b><span>المستوى العام: أتقن البعض</span></div><div className="stat"><b>3</b><span>مواد حالية</span></div><div className="stat"><b>2</b><span>مهارات تحتاج تدريبًا</span></div><div className="stat"><b>1</b><span>متابعة هذا الأسبوع</span></div></div>
      </section>

      <section className="section">
        <div className="section-head"><h2>المواد</h2></div>
        <div className="grid">
          <div className="card"><div className="icon">📖</div><h3>القرآن الكريم</h3><p>الحفظ والتلاوة والتقدم حسب التوزيع الحالي.</p></div>
          <div className="card"><div className="icon green">🕌</div><h3>الدراسات الإسلامية</h3><p>الدروس والمهارات التي تمت متابعتها.</p></div>
          <div className="card"><div className="icon amber">✍️</div><h3>لغتي</h3><p>القراءة والكتابة والإملاء والمهارات اللغوية.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><h2>الخطة العلاجية الحالية</h2><PrintButton label="طباعة الخطة العلاجية" /></div>
        <div className="card">
          <div className="kv"><span>المهارة</span><b>قراءة الكلمات الجديدة بطلاقة</b></div>
          <div className="kv"><span>الهدف</span><span>قراءة مجموعة الكلمات المقررة بثقة أكبر وتقليل التردد.</span></div>
          <div className="kv"><span>في المدرسة</span><span>تدريب قصير ومتكرر مع تعزيز مباشر.</span></div>
          <div className="kv"><span>في المنزل</span><span>5–7 دقائق قراءة يومية للكلمات المحددة بدون إطالة.</span></div>
          <div className="kv"><span>المراجعة</span><span>نراجع التقدم نهاية الأسبوع.</span></div>
        </div>
      </section>

      <section className="section no-print">
        <div className="section-head"><h2>التواصل مع المعلم</h2></div>
        <div className="card">
          <p style={{ marginBottom: 12 }}>التواصل مرتبط بالطالب نفسه، ويمكن للولي إرسال رسالة أو ملف واجب أو تسجيل صوتي عند تفعيل التخزين الخلفي.</p>
          <div className="mini-actions"><button className="btn">💬 رسالة</button><button className="btn secondary">📎 ملف</button><button className="btn secondary">🎙️ تسجيل صوتي</button></div>
        </div>
      </section>
    </main>
  );
}
