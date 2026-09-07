import Link from "next/link";
import { students } from "@/lib/sample-data";

export default function StudentsPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><div className="logo">👥</div><div><h1>الطلاب</h1><p>إدارة قائمة الفصل والمتابعة</p></div></div>
        <div className="mini-actions no-print">
          <button className="btn secondary">استيراد قائمة</button>
          <button className="btn">+ إضافة طالب</button>
        </div>
      </header>

      <div className="tabs no-print">
        <button className="tab active">الكل</button>
        <button className="tab">يحتاج متابعة</button>
        <button className="tab">متابعة خاصة</button>
        <button className="tab">المؤرشفون</button>
      </div>

      <section className="list">
        {students.map((student) => (
          <Link key={student.id} className="row" href={`/teacher/students/${student.id}`}>
            <div className="row-main">
              <div className="avatar">🧒</div>
              <div>
                <h4>{student.name}</h4>
                <small>{student.className} · أجهزة ولي الأمر {student.guardianDevices}/{student.guardianDeviceLimit}</small>
              </div>
            </div>
            {student.specialFollowUp ? <span className="badge red">متابعة خاصة</span> : <span className="badge">نشط</span>}
          </Link>
        ))}
      </section>

      <section className="section">
        <div className="notice warn">
          الحذف النهائي ليس الخيار الافتراضي. عند خروج طالب من الفصل سنؤرشفه حتى يبقى سجله السابق محفوظًا ويمكن استعادته لاحقًا.
        </div>
      </section>
    </main>
  );
}
