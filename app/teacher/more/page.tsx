import Link from "next/link";
import { UiIcon, type UiIconName } from "@/components/UiIcon";

type Tool = { href: string; title: string; description: string; icon: UiIconName };

const tools: Tool[] = [
  { href: "/teacher/reports", title: "التقارير", description: "ملخصات التقييم والتقدم", icon: "report" },
  { href: "/teacher/announcements", title: "التواصل", description: "الرسائل وطلبات أولياء الأمور", icon: "message" },
  { href: "/teacher/library", title: "المكتبة", description: "المصادر والملفات التعليمية", icon: "library" },
  { href: "/teacher/resources", title: "الأوراق والموارد", description: "التدريبات والواجبات المنشورة", icon: "book" },
  { href: "/teacher/distribution", title: "التوزيع الأسبوعي", description: "الدروس والمهارات حسب الأسبوع", icon: "layers" },
  { href: "/teacher/portfolio", title: "ملف الإنجاز", description: "الشواهد والأعمال", icon: "star" },
  { href: "/teacher/settings", title: "الإعدادات", description: "الفصل وبيانات المعلم", icon: "settings" },
];

export default function TeacherMorePage() {
  return (
    <main className="tc-page tc-more-page">
      <section className="tc-list-panel">
        {tools.map((tool) => (
          <Link className="tc-tool-row" href={tool.href} key={tool.href}>
            <span className="tc-tool-icon" aria-hidden="true"><UiIcon name={tool.icon} /></span>
            <div><b>{tool.title}</b><small>{tool.description}</small></div>
            <span className="tc-chevron" aria-hidden="true">‹</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
