"use client";

import Link from "next/link";
import { useState } from "react";
import { DateBar } from "@/components/DateBar";
import { PrintButton } from "@/components/PrintButton";
import { academicWeek } from "@/lib/schedule";
import { useTaallamt } from "@/lib/store";

type SkillInfo = {
  definition: string;
  examples: string[];
};

const skillInfo: Record<string, SkillInfo> = {
  "مراجعة الحركات القصيرة والسكون": {
    definition: "الحركات القصيرة هي الفتحة والضمة والكسرة، وتحدد صوت الحرف القصير. أما السكون فيدل على أن الحرف يُنطق من غير حركة.",
    examples: ["كَتَبَ", "كُتُب", "كِتاب", "يَكْتُب"],
  },
  "اللام القمرية": {
    definition: "هي لام التعريف التي تُكتب وتُنطق بوضوح عندما تأتي قبل أحد الحروف القمرية.",
    examples: ["القمر", "الكتاب", "البيت"],
  },
  "اللام الشمسية": {
    definition: "هي لام التعريف التي تُكتب ولا تُنطق، ويُشدَّد الحرف الذي بعدها عند القراءة.",
    examples: ["الشَّمس", "النَّاس", "السَّماء"],
  },
  "مراجعة اللام الشمسية والقمرية": {
    definition: "نميّز بين اللام القمرية التي تُنطق، واللام الشمسية التي لا تُنطق ويُشدَّد الحرف الذي بعدها.",
    examples: ["القمر — لام قمرية", "الشَّمس — لام شمسية"],
  },
  "تنوين الضم": {
    definition: "هو ضمتان في آخر الاسم، ويُسمع عند الوصل صوت نون ساكنة بعد الحرف الأخير.",
    examples: ["كتابٌ", "قلمٌ", "بابٌ"],
  },
  "تنوين الفتح": {
    definition: "هو فتحتان في آخر الاسم، ويُسمع عند الوصل صوت نون ساكنة بعد الحرف الأخير.",
    examples: ["كتابًا", "قلمًا", "بابًا"],
  },
  "تنوين الكسر": {
    definition: "هو كسرتان في آخر الاسم، ويُسمع عند الوصل صوت نون ساكنة بعد الحرف الأخير.",
    examples: ["كتابٍ", "قلمٍ", "بابٍ"],
  },
  "التضعيف (الشدة)": {
    definition: "الشدة تعني أن الحرف يُنطق مرتين متتاليتين: الأول ساكن والثاني متحرك.",
    examples: ["مدَّ", "علَّم", "حبَّ"],
  },
  "الشدة مع اللام الشمسية": {
    definition: "عند دخول (الـ) على كلمة تبدأ بحرف شمسي لا ننطق اللام، ويظهر الحرف الشمسي مشددًا.",
    examples: ["الشَّمس", "الطَّريق", "النَّجم"],
  },
  "مراجعة التنوين والشدة": {
    definition: "نراجع أشكال التنوين الثلاثة، ونميّز بينها وبين الشدة التي تدل على تكرار نطق الحرف.",
    examples: ["كتابٌ", "كتابًا", "كتابٍ", "شدَّ"],
  },
  "التاء المربوطة": {
    definition: "هي تاء تأتي غالبًا في آخر الاسم وتُكتب (ة). تُنطق تاءً عند الوصل، وتُسمع هاءً عند الوقف.",
    examples: ["مدرسة", "شجرة", "مدينة"],
  },
  "التنوين مع التاء المربوطة": {
    definition: "إذا نُوّنت الكلمة المنتهية بتاء مربوطة يوضع التنوين على التاء المربوطة، وتبقى مكتوبة (ة).",
    examples: ["مدرسةٌ", "مدرسةً", "مدرسةٍ"],
  },
  "المد بالألف": {
    definition: "هو إطالة صوت الفتحة عندما يأتي بعدها ألف مد، فيمتد الصوت مقدارًا أطول من الحركة القصيرة.",
    examples: ["باب", "قال", "كتاب"],
  },
  "المد بالواو": {
    definition: "هو إطالة صوت الضمة عندما يأتي بعدها واو ساكنة مناسبة لها.",
    examples: ["نور", "يقول", "سوق"],
  },
  "المد بالياء": {
    definition: "هو إطالة صوت الكسرة عندما يأتي بعدها ياء ساكنة مناسبة لها.",
    examples: ["كبير", "جميل", "فيل"],
  },
  "مراجعة المدود الثلاثة": {
    definition: "نراجع المد بالألف بعد الفتحة، والمد بالواو بعد الضمة، والمد بالياء بعد الكسرة، ونميّز صوت كل واحد منها.",
    examples: ["قال — بالألف", "نور — بالواو", "كبير — بالياء"],
  },
  "مراجعة شاملة على مهارات الفصل": {
    definition: "مراجعة لجميع مهارات الإملاء السابقة للتأكد من أن الطالب يميّزها ويكتب كلماتها بصورة صحيحة.",
    examples: ["اللام الشمسية والقمرية", "التنوين", "الشدة", "التاء المربوطة", "المدود"],
  },
};

export default function SpellingHandwritingPage() {
  const store = useTaallamt();
  const [week, setWeek] = useState(academicWeek());
  const practice = store.spellingPractices.find((item) => item.active && item.termId === store.activeTermId && item.week === week);
  const info = practice ? skillInfo[practice.skill] : undefined;

  function openWeek(nextWeek: number) {
    setWeek(nextWeek);
    setTimeout(() => {
      const target = document.getElementById("week-details");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  return (
    <main className="shell">
      <header className="topbar no-print"><div className="brand"><div className="logo">✍️</div><div><h1>الإملاء والخط</h1><p>مسار أسبوعي داخل مادة لغتي</p></div></div><Link className="btn secondary" href="/">لوحة المعلم</Link></header>
      <div className="no-print"><DateBar /></div>

      <section className="hero section"><div><h2>كتيب الإملاء والخط داخل تعلّمت</h2><p>اختر أسبوعًا من خريطة الفصل لتظهر لك المهارة مع تعريفها وأمثلتها ثم معايير الخط.</p></div><div className="hero-stats"><div className="stat"><b>10</b><span>درجة الإملاء</span></div><div className="stat"><b>4</b><span>سطور الخط</span></div><div className="stat"><b>17</b><span>أسبوعًا</span></div><div className="stat"><b>لغتي</b><span>ليست مادة مستقلة</span></div></div></section>

      <section className="section no-print"><div className="card"><div className="toolbar"><label>الأسبوع</label><select className="field" value={week} onChange={(e) => openWeek(Number(e.target.value))}>{Array.from({ length: 17 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>الأسبوع {item}</option>)}</select><PrintButton label="طباعة خطة الأسبوع" /><Link className="btn green" href="/teacher/resources">إنشاء تدريب/ورقة عمل</Link></div></div></section>

      <section className="section" id="week-details">
        {practice ? <div className="card"><div className="section-head"><div><h2>الأسبوع {practice.week} — {practice.unitName}</h2><p style={{ marginTop: 6 }}>{practice.skill}</p></div><span className="badge">من {practice.scoreTotal}</span></div>
          <div className="notice section"><h3 style={{ marginTop: 0 }}>تعريف المهارة</h3><p>{info?.definition ?? "تعريف هذه المهارة قيد الإضافة."}</p>{info?.examples?.length ? <><h4>أمثلة</h4><div className="toolbar">{info.examples.map((example) => <span className="badge" key={example}>{example}</span>)}</div></> : null}</div>
          <h3 className="section">معايير الخط</h3><ul>{practice.handwritingChecklist.map((item) => <li key={item} style={{ marginBottom: 9 }}>{item}</li>)}</ul><div className="notice section">التدريب: تتبع النموذج، ثم النسخ مع النظر، ثم الكتابة المستقلة مع المحافظة على السطور الأربعة.</div></div> : <div className="notice">لا يوجد تدريب مسجل لهذا الأسبوع.</div>}
      </section>

      <section className="section"><div className="section-head"><h2>خريطة الفصل</h2><span className="pill">اختر أسبوعًا لفتح التعريف</span></div><div className="list">{store.spellingPractices.filter((item) => item.termId === store.activeTermId).map((item) => <button type="button" className="row" key={item.id} onClick={() => openWeek(item.week)}><div className="row-main"><div className="avatar">{item.week}</div><div><h4>{item.skill}</h4><small>{item.unitName}</small></div></div><span className="badge">{item.week === week ? "مفتوح" : "فتح"}</span></button>)}</div></section>

      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}
