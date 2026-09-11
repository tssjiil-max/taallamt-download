import { ComprehensiveAssessment,PortfolioEvent,RemediationPlan } from '../core/domain';
import { projectStudent } from '../core/student-projection';
import { isOpenRemediation } from '../core/remediation';
export interface StudentDashboardInput{studentId:string;assessments:ComprehensiveAssessment[];remediation:RemediationPlan[];portfolio:PortfolioEvent[];monthlyStars:number}
export function buildStudentDashboard(input:StudentDashboardInput){
 const ordered=[...input.assessments].sort((a,b)=>(b.sessionDate+b.enteredAt).localeCompare(a.sessionDate+a.enteredAt));
 const projection=projectStudent({studentId:input.studentId,latestAssessments:ordered,activeRemediation:input.remediation.filter(isOpenRemediation),portfolio:input.portfolio,monthlyStars:input.monthlyStars});
 return {studentId:projection.studentId,stars:{current:Math.min(projection.monthlyStars,30),max:30},focusedFollowup:projection.focusedFollowup,latestResults:projection.latestAssessments.slice(0,10),activeRemediation:projection.activeRemediation,achievements:projection.portfolio.filter(e=>['mastery','improvement','remediation_improved','remediation_resolved','achievement','positive_behavior'].includes(e.type))};
}
