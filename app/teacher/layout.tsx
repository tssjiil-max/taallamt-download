import type { ReactNode } from "react";
import { TeacherFrame } from "@/components/TeacherChrome";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <TeacherFrame>{children}</TeacherFrame>;
}
