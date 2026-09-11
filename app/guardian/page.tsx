"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { UiIcon } from "@/components/UiIcon";
import {
  guardianLogin,
  guardianMe,
  guardianPortfolioDelete,
  guardianPortfolioItems,
  guardianPortfolioUpload,
  guardianRequestContact,
  guardianSearch,
  guardianSendHomeBehavior,
  guardianSendMessage,
  type GuardianPortfolioItem,
  type GuardianSearchStudent,
} from "@/lib/guardian-api";
import { academicWeek, plansForWeek } from "@/lib/schedule";
import type {
  LearningResource,
  MasteryLevel,
  Message,
  Skill,
  SkillAssessment,
  SpecialFollowUp,
  Subject,
  Term,
  ValueStar,
  ValueTarget,
  WeeklyPlan,
} from "@/lib/types";
import "./guardian-polish.css";
import "./dashboard-reference.css";

const icons = "/guardian-icons/";
const schoolName = "مدرسة عمرو بن أوس الثقفي";
const subjectOrder = ["لغتي", "القرآن الكريم", "الدراسات الإسلامية"];
const levelLabel: Record<MasteryLevel, string> = {
  mastered: "ممتاز",
  partial: "جيد جدًا",
  needs_training: "يحتاج متابعة",
};

type Profile = {
  preferredName?: string;
  photoDataUrl?: string;
  interests?: string;
  strengths?: string;
  learningDifficulties?: string;
  helpfulNotes?: string;
};

type CommunicationAccess = {
  status: "closed" | "pending" | "approved" | "rejected";
  reason?: string;
};

type Bundle = {
  student: {
    id: string;
    name: string;
    className: string;
    subjectLevels: Record<string, MasteryLevel>;
  };
  profile: Profile | null;
  activeTerm: Term | null;
  subjects: Subject[];
  weeklyPlans: WeeklyPlan[];
  skills: Skill[];
  assessments: SkillAssessment[];
  resources: Array<Omit<LearningResource, "answerGuide">>;
  values: ValueTarget[];
  valueStars: ValueStar[];
  followUp: SpecialFollowUp | null;
  messages: Message[];
  communicationAccess?: CommunicationAccess;
};

function subjectIcon(name: string) {
  if (name.includes("لغتي")) return icons + "lughati.svg";
  if (name.includes("قرآن")) return icons + "quran.svg";
  return icons + "islamic.svg";
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length <= 3 ? parts.join(" ") : [parts[0], parts[1], parts.at(-1)].join(" ");
}

function errorText(error: unknown) {
  const code = (error as { payload?: { error?: string } })?.payload?.error;
  if (code === "ACCESS_DISABLED") return "هذا الطالب غير نشط حاليًا.";
  return "تعذر فتح صفحة الطالب الآن.";
}

function HeaderDateStrip() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const date = now ?? new Date();
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const gregorian = new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return (
    <section className="g2-date-strip" aria-label="التاريخ وآخر تحديث">
      <div className="g2-date-main"><UiIcon name="calendar" /><div><b>{hijri}</b><span>{gregorian}</span></div></div>
      <div className="g2-update-time"><b>{time}</b><span>آخر تحديث اليوم</span></div>
    </section>
  );
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("IMAGE_FAILED"));
      image.onload = () => {
        const max = 1400;
        const ratio = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("CANVAS_FAILED"));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.72);
        if (data.length > 700_000) return reject(new Error("TOO_LARGE"));
        resolve(data);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function GuardianPage() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<GuardianSearchStudent[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [homeBehavior, setHomeBehavior] = useState("الالتزام بالتعليمات");
  const [homeLevel, setHomeLevel] = useState<"متميز ⭐" | "جيد ✓" | "يحتاج متابعة !">("متميز ⭐");
  const [contactReason, setContactReason] = useState("");
  const [message, setMessage] = useState("");
  const [portfolioItems, setPortfolioItems] = useState<GuardianPortfolioItem[]>([]);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  const refresh = async () => {
    const next = await guardianMe<Bundle>();
    setBundle(next);
    return next;
  };

  const refreshPortfolio = async () => {
    const response = await guardianPortfolioItems();
    setPortfolioItems(response.items);
  };

  useEffect(() => {
    guardianMe<Bundle>()
      .then((data) => {
        setBundle(data);
        return guardianPortfolioItems();
      })
      .then((response) => response && setPortfolioItems(response.items))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (bundle || search.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(() => {
      guardianSearch(search.trim()).then((r) => setMatches(r.students)).catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [bundle, search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await guardianLogin(selected);
      await refresh();
      await refreshPortfolio();
    } catch (x) {
      setError(errorText(x));
    } finally {
      setBusy(false);
    }
  }

  async function sendHomeEvaluation() {
    setBusy(true);
    try {
      await guardianSendHomeBehavior(homeBehavior, homeLevel);
      setNotice("تم حفظ تقييم ولي الأمر وإرساله للمعلم.");
    } catch {
      setNotice("تعذر إرسال تقييم المنزل الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function requestContact(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await guardianRequestContact(contactReason.trim());
      setContactReason("");
      await refresh();
      setNotice("تم إرسال طلب التواصل للمعلم.");
    } catch {
      setNotice("تعذر إرسال طلب التواصل الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setBusy(true);
    try {
      await guardianSendMessage(message.trim());
      setMessage("");
      await refresh();
      setNotice("تم إرسال الرسالة للمعلم.");
    } catch {
      setNotice("تعذر إرسال الرسالة الآن.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPortfolio(event: FormEvent) {
    event.preventDefault();
    if (!portfolioFile) return;
    setBusy(true);
    try {
      let dataUrl = "";
      if (portfolioFile.type.startsWith("image/")) {
        dataUrl = await resizeImage(portfolioFile);
      } else if (portfolioFile.type === "application/pdf") {
        if (portfolioFile.size > 500_000) throw new Error("TOO_LARGE");
        dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("READ_FAILED"));
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(portfolioFile);
        });
      } else {
        throw new Error("TYPE");
      }
      await guardianPortfolioUpload({
        title: portfolioTitle.trim() || portfolioFile.name.replace(/\.[^.]+$/, ""),
        fileName: portfolioFile.name,
        mimeType: portfolioFile.type,
        dataUrl,
      });
      setPortfolioTitle("");
      setPortfolioFile(null);
      const input = document.getElementById("g2-portfolio-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refreshPortfolio();
      setNotice("تمت إضافة العمل إلى ملف الإنجاز.");
    } catch (x) {
      setNotice((x as Error)?.message === "TOO_LARGE" ? "الملف كبير. استخدم صورة أو PDF أصغر من 500 كيلوبايت." : "تعذر رفع العمل. استخدم صورة أو PDF صغيرًا.");
    } finally {
      setBusy(false);
    }
  }

  async function removePortfolio(id: string) {
    setBusy(true);
    try {
      await guardianPortfolioDelete(id);
      await refreshPortfolio();
      setNotice("تم حذف العمل من ملف الإنجاز.");
    } catch {
      setNotice("تعذر حذف العمل الآن.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <main className="shell"><div className="empty-state">جاري فتح صفحة الطالب…</div></main>;

  if (!bundle) {
    return (
      <main className="shell guardian-shell g2-login">
        <section className="g2-login-card">
          <img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" />
          <h1>تعلّمت</h1>
          <p>افتح صفحة الطالب بالاسم.</p>
          <form onSubmit={login}>
            <input className="field" value={search} onChange={(e) => { setSearch(e.target.value); setSelected(""); }} placeholder="اسم الطالب" />
            <div className="g2-search-results">
              {matches.map((student) => (
                <button type="button" key={student.id} className={selected === student.id ? "active" : ""} onClick={() => setSelected(student.id)}>
                  <b>{student.name}</b><span>{student.className}</span>
                </button>
              ))}
            </div>
            {error && <div className="notice warn">{error}</div>}
            <button className="btn" disabled={busy || !selected}>{busy ? "جاري الفتح…" : "فتح صفحة الطالب"}</button>
          </form>
        </section>
      </main>
    );
  }

  const student = bundle.student;
  const profile = bundle.profile;
  const displayName = shortName(profile?.preferredName || student.name);
  const week = academicWeek();
  const weekly = plansForWeek(bundle.weeklyPlans, week);
  const subjects = bundle.subjects
    .filter((x) => x.enabled !== false && subjectOrder.includes(x.name))
    .sort((a, b) => subjectOrder.indexOf(a.name) - subjectOrder.indexOf(b.name));
  const stars = bundle.valueStars.length;
  const progress = Math.min(stars, 30);
  const communicationStatus = bundle.communicationAccess?.status ?? "closed";

  const subjectCards = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    icon: subjectIcon(subject.name),
    level: student.subjectLevels[subject.id] ? levelLabel[student.subjectLevels[subject.id]] : "لم يقيّم",
  }));
  const lughati = subjects.find((x) => x.name.includes("لغتي"));
  subjectCards.push({
    id: "spelling",
    name: "الإملاء والخط",
    icon: icons + "message.svg",
    level: lughati && student.subjectLevels[lughati.id] ? levelLabel[student.subjectLevels[lughati.id]] : "لم يقيّم",
  });

  const recentAssessments = [...bundle.assessments].sort((a, b) => b.assessedAt.localeCompare(a.assessedAt)).slice(0, 4);
  const profileFacts = [
    profile?.interests && { label: "اهتماماته", value: profile.interests },
    profile?.strengths && { label: "نقاط القوة", value: profile.strengths },
    profile?.helpfulNotes && { label: "ما يساعده", value: profile.helpfulNotes },
    profile?.learningDifficulties && { label: "يحتاج دعمًا في", value: profile.learningDifficulties },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <main className="g2-page" dir="rtl">
      {notice && <div className="g2-toast" role="status">{notice}</div>}

      <header className="g2-hero" id="home">
        <div className="g2-brand-copy">
          <h1>تعلّمت <span>★</span></h1>
          <p>القمة تكفي الجميع</p>
          <div className="g2-student-lines">
            <div><UiIcon name="student" /><b>{displayName}</b></div>
            <div><UiIcon name="book" /><span>{student.className}</span></div>
            <div><UiIcon name="library" /><span>{schoolName}</span></div>
          </div>
        </div>
        <div className="g2-knowledge-mark" aria-label="المعرفة قوة">
          <div className="g2-book-star"><UiIcon name="book" /><span>★</span></div>
          <b>المعرفة قوة</b>
        </div>
      </header>

      <HeaderDateStrip />

      <section className="g2-card g2-stars-card" id="achievements">
        <div className="g2-stars-head"><div><h2>⭐ تحدي النجوم</h2><p>كل يوم إنجاز .. نحو هدف أكبر!</p></div><span>{stars} نجمة</span></div>
        <div className="g2-stars-body">
          <div className="g2-shak-reward">
            <img src="/teacher-icons/shakabumbo-logo.svg" alt="شكابمبو" />
            <button type="button" onClick={() => {
              const rewards = ["مهمة مميزة في الفصل", "هدية بسيطة من ولي الأمر", "امتياز بسيط من المعلم", "اختيار نشاط محبب"];
              setNotice(`شكابمبو اختار لك: ${rewards[Math.floor(Math.random() * rewards.length)]}`);
            }}>شكابمبو يختار هديتك!</button>
            <small>إذا أكملت 30 نجمة اضغط على شكابمبو ليقترح مكافأتك.</small>
          </div>
          <div className="g2-thirty-stars" aria-label={`${progress} من 30 نجمة`}>
            {Array.from({ length: 30 }, (_, index) => (
              <div key={index} className={index < progress ? "earned" : ""}><span>★</span><small>{index + 1}</small></div>
            ))}
          </div>
        </div>
        <div className="g2-reward-title"><UiIcon name="sparkle" /> مكافآت مقترحة لك بعد إكمال 30 نجمة:</div>
        <div className="g2-reward-grid">
          {["مهمة في الفصل 3 أيام", "هدية بسيطة من ولي الأمر", "امتياز بسيط من المعلم", "اختيار نشاط محبب"].map((reward, index) => (
            <button type="button" key={reward} onClick={() => setNotice(`تم اختيار: ${reward}`)}><span>{["★", "🎁", "●", "🎮"][index]}</span>{reward}</button>
          ))}
        </div>
      </section>

      <section className="g2-card g2-homework-row" id="follow">
        <div><UiIcon name="report" /><span><b>الواجبات</b><small>تابع واجباتك اليومية</small></span></div>
        <a href="#weekly"><b>{weekly.length} واجبات</b><span>أنجز واجباتك خطوة نحو التميز!</span><i>‹</i></a>
      </section>

      <section className="g2-card g2-weekly" id="weekly">
        <div className="g2-section-title"><UiIcon name="report" /><div><h2>ملخص هذا الأسبوع</h2><p>أداء {displayName.split(" ")[0]} في المواد</p></div></div>
        <div className="g2-subject-grid">
          {subjectCards.map((subject) => (
            <button type="button" key={subject.id} onClick={() => setNotice(`${subject.name}: ${subject.level}`)}>
              <img src={subject.icon} alt="" /><b>{subject.name}</b><span>{subject.level}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="g2-duo-row">
        <a className="g2-card" href="#tasks"><UiIcon name="calendar" /><div><b>مهامي هذا الأسبوع</b><span>لديك {weekly.length} مهام نشطة</span><small>أنجزها وحقق المزيد من النجوم</small></div><i>‹</i></a>
        <button className="g2-card" type="button" onClick={() => setNotice(stars ? `أحسنت! لديك ${stars} نجمة حتى الآن.` : "ابدأ إنجازك الأول لتحصل على نجمتك الأولى.")}><UiIcon name="star" /><div><b>إنجاز اليوم</b><span>{stars ? "أحسنت يا بطل!" : "جاهز للإنجاز"}</span><small>مستمر في التميز</small></div><i>‹</i></button>
      </section>

      <section className="g2-card g2-tasks" id="tasks">
        <div className="g2-section-title"><UiIcon name="calendar" /><div><h2>مهامي هذا الأسبوع</h2><p>الأسبوع {week}</p></div></div>
        {weekly.length ? <div className="g2-task-list">{weekly.map((item) => <article key={item.id}><span>✓</span><div><b>{subjects.find((subject) => subject.id === item.subjectId)?.name || "المادة"}</b><p>{item.title}</p></div></article>)}</div> : <div className="g2-empty">لا توجد مهام منشورة حاليًا.</div>}
      </section>

      <section className="g2-card g2-portfolio" id="portfolio">
        <div className="g2-section-title"><img src={icons + "trophy.svg"} alt="" /><div><h2>ملف إنجاز الطالب</h2><p>ارفع أعمالك وصور إنجازاتك هنا</p></div></div>
        <form className="g2-upload" onSubmit={uploadPortfolio}>
          <input value={portfolioTitle} onChange={(e) => setPortfolioTitle(e.target.value)} maxLength={80} placeholder="اسم العمل — اختياري" />
          <label htmlFor="g2-portfolio-file"><UiIcon name="layers" /><span>{portfolioFile ? portfolioFile.name : "اختيار صورة أو PDF"}</span></label>
          <input id="g2-portfolio-file" className="g2-file-input" type="file" accept="image/*,application/pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => setPortfolioFile(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={busy || !portfolioFile}>{busy ? "جاري الحفظ…" : "إضافة إلى ملف الإنجاز"}</button>
        </form>
        <div className="g2-work-grid">
          {portfolioItems.map((item) => (
            <article key={item.id}>
              {item.mimeType.startsWith("image/") ? <img src={item.dataUrl} alt={item.title} /> : <div className="g2-pdf"><UiIcon name="report" /><span>PDF</span></div>}
              <div><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</small></div>
              <div className="g2-work-actions"><a href={item.dataUrl} download={item.fileName}>فتح</a><button type="button" disabled={busy} onClick={() => void removePortfolio(item.id)}>حذف</button></div>
            </article>
          ))}
          {!portfolioItems.length && <div className="g2-empty">لم ترفع أعمالًا بعد. أضف أول إنجاز من الزر أعلاه.</div>}
        </div>
      </section>

      <section className="g2-card g2-progress" id="progress">
        <div className="g2-section-title"><UiIcon name="check" /><div><h2>المتابعة</h2><p>آخر التقييمات المسجلة</p></div></div>
        <div className="g2-assessment-list">
          {recentAssessments.map((assessment) => {
            const skill = bundle.skills.find((item) => item.id === assessment.skillId);
            return <article key={assessment.id}><div><b>{skill?.title || "مهارة"}</b><span>{skill?.category || "تقييم"}</span></div><strong className={assessment.level === "needs_training" ? "needs" : ""}>{levelLabel[assessment.level]}</strong></article>;
          })}
          {!recentAssessments.length && <div className="g2-empty">ستظهر التقييمات هنا بعد أول تقييم من المعلم.</div>}
        </div>
        {bundle.followUp?.goal && <div className="g2-follow-goal"><b>الهدف الحالي</b><p>{bundle.followUp.goal}</p></div>}
      </section>

      <section className="g2-card g2-library" id="library">
        <div className="g2-section-title"><img src={icons + "library.svg"} alt="" /><div><h2>المكتبة</h2><p>للقراءة والتحميل</p></div></div>
        <div className="g2-library-grid">
          {bundle.resources.map((resource) => <Link href={`/guardian/resources/${resource.id}`} key={resource.id}><img src={icons + "library.svg"} alt="" /><b>{resource.title}</b><span>{resource.instructions || "مادة تعليمية"}</span></Link>)}
          {!bundle.resources.length && <div className="g2-empty">لا توجد ملفات منشورة حاليًا.</div>}
        </div>
      </section>

      <section className="g2-card g2-tools" id="tools">
        <div className="g2-section-title"><UiIcon name="more" /><div><h2>أدواتي</h2><p>معلومات الطالب وخيارات ولي الأمر</p></div></div>
        <Link className="g2-profile-link" href="/guardian/profile"><UiIcon name="student" /><div><b>معلومات الطالب</b><span>تعديل الصورة والاهتمامات ونقاط القوة</span></div><i>‹</i></Link>
        {profileFacts.length > 0 && <div className="g2-profile-facts">{profileFacts.map((fact) => <article key={fact.label}><b>{fact.label}</b><p>{fact.value}</p></article>)}</div>}

        <div className="g2-home-behavior">
          <div className="g2-inline-title"><span>خاص بولي الأمر</span><div><h3>تقييم السلوك في المنزل</h3><p>تقييم مستقل عن فتح المحادثة مع المعلم</p></div></div>
          <select value={homeBehavior} onChange={(e) => setHomeBehavior(e.target.value)}>
            <option>الالتزام بالتعليمات</option><option>احترام الآخرين</option><option>تحمل المسؤولية</option><option>النظافة والترتيب</option><option>الصدق والأمانة</option>
          </select>
          <div className="g2-behavior-buttons">
            <button type="button" className={homeLevel === "متميز ⭐" ? "active" : ""} onClick={() => setHomeLevel("متميز ⭐")}>⭐ متميز</button>
            <button type="button" className={homeLevel === "جيد ✓" ? "active" : ""} onClick={() => setHomeLevel("جيد ✓")}>✓ جيد</button>
            <button type="button" className={homeLevel === "يحتاج متابعة !" ? "active" : ""} onClick={() => setHomeLevel("يحتاج متابعة !")}>! يحتاج متابعة</button>
          </div>
          <button className="g2-primary" type="button" disabled={busy} onClick={() => void sendHomeEvaluation()}>إرسال تقييم المنزل</button>
        </div>

        <div className="g2-contact-box">
          <h3>التواصل مع المعلم</h3>
          {communicationStatus === "approved" ? <form onSubmit={sendMessage}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب رسالتك للمعلم" /><button disabled={busy || !message.trim()}>إرسال</button></form> : communicationStatus === "pending" ? <p>طلب التواصل قيد المراجعة.</p> : <form onSubmit={requestContact}><input value={contactReason} onChange={(e) => setContactReason(e.target.value)} placeholder="سبب التواصل — اختياري" /><button disabled={busy}>طلب فتح التواصل</button></form>}
        </div>
      </section>

      <footer className="g2-credit">برمجة سلطان الصاعدي</footer>

      <nav className="g2-bottom-nav" aria-label="التنقل في صفحة الطالب">
        <a className="active" href="#home"><UiIcon name="home" /><span>الرئيسية</span></a>
        <a href="#progress"><UiIcon name="report" /><span>المتابعة</span></a>
        <a href="#achievements"><UiIcon name="star" /><span>الإنجازات</span></a>
        <a href="#library"><UiIcon name="library" /><span>المكتبة</span></a>
        <a href="#tools"><UiIcon name="more" /><span>أدواتي</span></a>
      </nav>
    </main>
  );
}
