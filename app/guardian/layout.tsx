import { GuardianChrome } from "@/components/GuardianChrome";
import "./guardian-polish.css";
import "../student-unified.css";
import "./student-icons.css";
import "./student-reference-one.css";

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return <GuardianChrome>{children}</GuardianChrome>;
}
