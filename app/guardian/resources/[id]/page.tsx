"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { useTaallamt } from "@/lib/store";

function downloadHtml(title: string, instructions: string, items: string[]) {
  const body = items.map((item) => `<li style="margin:14px 0;line-height:1.9">${item.replace(/^\d+\)\s*/, "")}</li>`).join("");
  const html = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>${title}</title><body style="font-family:Tahoma,Arial,sans-serif;max-width:800px;margin:40px auto;padding:24px"><h1>${title}</h1><p>${instructions}</p><hr><ol>${body}</ol><div style="margin-top:40px;border-top:1px solid #ddd;padding-top:12px;font-size:12px;color:#666">برمجة سلطان الصاعدي</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[\\/:*?"<>|]/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GuardianResourcePage() {
  const params = useParams<{ id: string }>();
  const store = useTaallamt();
  const resource = store.resources.find((item) => item.id === params.id && item.publishedToGuardian);
  if (!resource) return <main className="shell"><div className="notice warn">الورقة غير موجودة أو لم تعد منشورة.</div><Link className="btn secondary section" href="/guardian">العودة</Link></main>;
  const subject = store.subjects.find((item) => item.id === resource.subjectId);

  return (
    <main className="shell">
      <header className="topbar no-print"><div className="brand"><div className="logo">📝</div><div><h1>{resource.title}</h1><p>{subject?.name ?? "المادة"}</p></div></div><div className="mini-actions"><PrintButton label="طباعة / حفظ PDF" /><button className="btn secondary" type="button" onClick={() => downloadHtml(resource.title, resource.instructions, resource.items)}>تحميل نسخة</button><Link className="btn secondary" href="/guardian">العودة</Link></div></header>
      <section className="resource-paper section">
        <div className="resource-head"><div><h1>{resource.title}</h1><p>الصف الثاني الابتدائي · {subject?.name ?? "المادة"}</p></div><div className="resource-meta"><span>اسم الطالب: ____________________</span><span>التاريخ: ____ / ____ / ______</span></div></div>
        <p className="resource-instructions">{resource.instructions}</p>
        <ol className="resource-items">{resource.items.map((item, index) => <li key={index}>{item.replace(/^\d+\)\s*/, "")}</li>)}</ol>
        <div className="resource-footer">برمجة سلطان الصاعدي</div>
      </section>
    </main>
  );
}
