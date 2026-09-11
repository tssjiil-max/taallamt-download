import { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from './domain';
import { isOpenRemediation } from './remediation';
export interface StudentProjection{studentId:string;latestAssessments:ComprehensiveAssessment[];activeRemediation:RemediationPlan[];portfolio:PortfolioEvent[];monthlyStars:number;focusedFollowup:boolean}
export function shouldBeFocused(studentId:string,assessments:ComprehensiveAssessment[],plans:RemediationPlan[]):boolean{
 if(plans.some(p=>p.studentId===studentId&&isOpenRemediation(p)))return true;
 const recent=assessments.filter(a=>a.studentId===studentId).sort((a,b)=>(b.sessionDate+b.enteredAt).localeCompare(a.sessionDate+a.enteredAt)).slice(0,5);
 const counts=new Map<string,number>();for(const a of recent)for(const item of a.academic)if(item.result==='not_mastered')counts.set(item.targetId,(counts.get(item.targetId)??0)+1);
 return [...counts.values()].some(count=>count>=2);
}
// صفحة الطالب وواجهة المعلم تقرآن من نفس الإسقاط؛ لا توجد نسخة بيانات ثانية لولي الأمر.
export function projectStudent(input:Omit<StudentProjection,'focusedFollowup'>):StudentProjection{return {...input,focusedFollowup:shouldBeFocused(input.studentId,input.latestAssessments,input.activeRemediation)}}
