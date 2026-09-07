import { PrintButton } from "@/components/PrintButton";
import { ShareButton } from "@/components/ShareButton";

export default function PortfolioPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">📁</div><div><h1>ملف إنجاز المعلم</h1><p>يتكوّن تلقائيًا من العمل المسجل في النظام</p></div></div>
        <div className="mini-actions"><PrintButton label="طباعة الملف" /><ShareButton title="ملف إنجاز المعلم" text="ملف إنجاز المعلم من منصة تعلّمت" /></div>
      </header>

      <section className="hero">
        <div><h2>ملف الإنجاز — الفصل الدراسي الأول</h2><p>نسخة مرتبة للطباعة والمشاركة، ويمكن إنشاء نسخة مشاركة تخفي بيانات الطلاب الحساسة.</p></div>
        <div className="hero-stats"><div className="stat"><b>3</b><span>مواد</span></div><div className="stat"><b>30</b><span>طالبًا عند الاستيراد</span></div><div className="stat"><b>—</b><span>خطط علاجية</span></div><div className="stat"><b>—</b><span>أنشطة موثقة</span></div></div>
      </section>

      <section className="grid">
        {[
          ["📅", "التوزيع الأسبوعي", "التوزيع المعتمد وما تم تنفيذه"],
          ["✅", "سجل المتابعة", "نتائج التقييم وتقدم الطلاب"],
          ["🧩", "الخطط العلاجية", "الخطط والإجراءات ونتائج المراجعة"],
          ["📝", "الواجبات والمهام", "نماذج من المهام المسندة"],
          ["⭐", "التحفيز والإنجازات", "الجوائز والمبادرات الصفية"],
          ["📊", "إحصاءات الفصل", "ملخص تقدم الفصل بدون كشف بيانات حساسة"],
        ].map(([icon, title, text]) => <div className="card" key={title}><div className="icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>)}
      </section>
    </main>
  );
}
