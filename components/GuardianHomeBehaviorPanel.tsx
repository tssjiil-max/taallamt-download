"use client";

import { useEffect, useState } from "react";
import { guardianMe, guardianSendHomeBehavior } from "@/lib/guardian-api";

const behaviors = [
  "الالتزام بالتعليمات",
  "احترام الآخرين",
  "تحمل المسؤولية",
  "النظافة والترتيب",
  "الصدق والأمانة",
];
const levels = ["متميز ⭐", "جيد ✓", "يحتاج متابعة !"];

export function GuardianHomeBehaviorPanel() {
  const [available, setAvailable] = useState(false);
  const [behavior, setBehavior] = useState(behaviors[0]);
  const [level, setLevel] = useState(levels[1]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    guardianMe()
      .then(() => { if (alive) setAvailable(true); })
      .catch(() => { if (alive) setAvailable(false); });
    return () => { alive = false; };
  }, []);

  async function submit() {
    setBusy(true);
    setNotice("");
    try {
      await guardianSendHomeBehavior(behavior, level);
      setNotice("تم إرسال تقييم المنزل للمعلم.");
    } catch {
      setNotice("تعذر إرسال تقييم المنزل الآن.");
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  return (
    <section className="ui-section guardian-independent-home-behavior">
      <div className="section-title-row">
        <div><h2>السلوك في المنزل</h2><p>متابعة تربوية منظمة ومستقلة عن المحادثة مع المعلم</p></div>
        <span className="soft-chip">ولي الأمر</span>
      </div>
      <div className="guardian-home-behavior-panel">
        <label className="stack">السلوك
          <select className="field" value={behavior} onChange={(event) => setBehavior(event.target.value)}>
            {behaviors.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="segmented" aria-label="مستوى السلوك">
          {levels.map((item) => <button type="button" className={level === item ? "active" : ""} onClick={() => setLevel(item)} key={item}>{item}</button>)}
        </div>
        <button className="btn" type="button" disabled={busy} onClick={() => void submit()}>{busy ? "جاري الإرسال…" : "إرسال تقييم المنزل"}</button>
        {notice && <div className="notice" role="status">{notice}</div>}
        <small>هذا التقييم لا يفتح المحادثة ولا يحتاج موافقة المعلم على التواصل.</small>
      </div>
    </section>
  );
}
