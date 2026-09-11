import { DirectGuardianLogin } from "@/components/DirectGuardianLogin";
import { StudentFrame } from "@/components/StudentChrome";
import "./guardian-polish.css";
import "../student-unified.css";

export default function GuardianLayout({children}:{children:React.ReactNode}){
  return <StudentFrame><DirectGuardianLogin />{children}</StudentFrame>;
}
