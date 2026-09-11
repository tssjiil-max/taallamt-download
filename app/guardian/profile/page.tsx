"use client";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { guardianMe, guardianSaveProfile } from "@/lib/guardian-api";
import type { ValueStar } from "@/lib/types";
type Profile = {
  preferredName?: string;
  interests?: string;
  strengths?: string;
  learningDifficulties?: string;
  helpfulNotes?: string;
  photoDataUrl?: string;
};
type Bundle = {
  student: { name: string; className: string };
  profile: Profile | null;
  valueStars: ValueStar[];
};
export default function GuardianProfilePage() {
  const [bundle, setBundle] = useState<Bundle | null>(null),
    [form, setForm] = useState({
      preferredName: "",
      interests: "",
      strengths: "",
      learningDifficulties: "",
      helpfulNotes: "",
      photoDataUrl: "",
    }),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    guardianMe<Bundle>()
      .then((b) => {
        setBundle(b);
        const p = b.profile ?? {};
        setForm({
          preferredName: p.preferredName ?? "",
          interests: p.interests ?? "",
          strengths: p.strengths ?? "",
          learningDifficulties: p.learningDifficulties ?? "",
          helpfulNotes: p.helpfulNotes ?? "",
          photoDataUrl: p.photoDataUrl ?? "",
        });
      })
      .catch(() => (location.href = "/guardian"));
  }, []);
  function pickPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("اختر صورة فقط.");
      return;
    }
    const img = new Image(),
      r = new FileReader();
    r.onload = () => {
      img.onload = () => {
        const max = 360,
          scale = Math.min(1, max / Math.max(img.width, img.height)),
          c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", 0.72);
        if (data.length > 270000) {
          setNotice("الصورة كبيرة. اختر صورة أصغر.");
          return;
        }
        setForm((v) => ({ ...v, photoDataUrl: data }));
        setNotice("");
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await guardianSaveProfile(form);
      setNotice("تم حفظ معلومات الطالب.");
    } catch {
      setNotice("تعذر الحفظ الآن.");
    } finally {
      setBusy(false);
    }
  }
  if (!bundle)
    return (
      <main className="shell">
        <div className="empty-state">جاري فتح ملف الطالب…</div>
      </main>
    );
  return (
    <main className="shell guardian-shell guardian-profile-page">
      <header className="profile-top">
        <Link href="/guardian">رجوع</Link>
        <div>
          <h1>ملف الطالب</h1>
          <p>معلومات تساعد المعلم على فهم الطفل ودعمه</p>
        </div>
      </header>
      <section className="profile-info-card no-print">
        <Link className="guardian-contact-trigger" href="/guardian/portfolio">
          <img src="/guardian-icons/trophy.svg" alt="" />
          <span><b>ملف إنجاز الطالب</b><small>المهارات والنجوم والأعمال والشواهد — يتحدث تلقائيًا</small></span>
        </Link>
      </section>
      <form onSubmit={save}>
        <label className="profile-settings-hero">
          <span className="profile-photo editable-photo">
            {form.photoDataUrl ? (
              <img src={form.photoDataUrl} alt="صورة الطالب" />
            ) : (
              <img src="/shakabumbo-guardian.webp" alt="إضافة صورة الطالب" />
            )}
            <span className="photo-camera">
              {form.photoDataUrl ? "تغيير الصورة" : "إضافة صورة"}
            </span>
          </span>
          <span className="profile-identity">
            <strong>{form.preferredName || bundle.student.name}</strong>
            <small>{bundle.student.className}</small>
            <em>
              {form.photoDataUrl
                ? "اضغط الصورة لتغييرها"
                : "اضغط لإضافة صورة الطالب"}
            </em>
          </span>
          <input type="file" accept="image/*" onChange={pickPhoto} />
        </label>
        <section className="profile-info-card">
          <h2>ما الذي يحتاج المعلم معرفته؟</h2>
          <p className="profile-help">
            جميع الحقول اختيارية. اكتب فقط المعلومات المفيدة داخل المدرسة دون
            تشخيصات أو تفاصيل خاصة غير ضرورية.
          </p>
          <label>
            الاسم الذي يفضّل أن نناديه به
            <input
              className="field"
              maxLength={80}
              value={form.preferredName}
              onChange={(e) =>
                setForm((v) => ({ ...v, preferredName: e.target.value }))
              }
              placeholder="مثال: أسامة"
            />
          </label>
          <label>
            الاهتمامات والهوايات
            <textarea
              className="field textarea"
              maxLength={500}
              value={form.interests}
              onChange={(e) =>
                setForm((v) => ({ ...v, interests: e.target.value }))
              }
              placeholder="القراءة، الرسم، كرة القدم، القصص…"
            />
          </label>
          <label>
            نقاط القوة
            <textarea
              className="field textarea"
              maxLength={500}
              value={form.strengths}
              onChange={(e) =>
                setForm((v) => ({ ...v, strengths: e.target.value }))
              }
              placeholder="يتعلم بصريًا، يحب المشاركة، سريع الحفظ…"
            />
          </label>
          <label>
            الأشياء أو المهارات التي يجدها صعبة وما يقلقه في البيئة التعليمية
            <textarea
              className="field textarea"
              maxLength={1000}
              value={form.learningDifficulties}
              onChange={(e) =>
                setForm((v) => ({ ...v, learningDifficulties: e.target.value }))
              }
              placeholder="مثال: يتردد في القراءة أمام الآخرين، يحتاج وقتًا أطول في الكتابة…"
            />
          </label>
          <label>
            ما الذي يساعده عندما يتوتر أو يحتاج دعمًا؟
            <textarea
              className="field textarea"
              maxLength={1000}
              value={form.helpfulNotes}
              onChange={(e) =>
                setForm((v) => ({ ...v, helpfulNotes: e.target.value }))
              }
              placeholder="مثال: التشجيع الهادئ، إعطاؤه وقتًا، تقسيم المهمة إلى خطوات…"
            />
          </label>
          {notice && <div className="notice">{notice}</div>}
          <button className="btn profile-save" disabled={busy}>
            {busy ? "جاري الحفظ…" : "حفظ معلومات الطالب"}
          </button>
        </section>
      </form>
      <footer className="site-credit">برمجة سلطان الصاعدي</footer>
    </main>
  );
}