import { StudentFrame } from "@/components/StudentChrome";
import "../student-unified.css";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentFrame>{children}</StudentFrame>;
}
