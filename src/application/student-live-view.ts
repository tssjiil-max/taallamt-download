import type { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from '../core/domain';
import { buildStudentDashboard } from './student-dashboard';

export interface StudentLiveReader {
  assessments(studentId:string):Promise<ComprehensiveAssessment[]>;
  remediation(studentId:string):Promise<RemediationPlan[]>;
  portfolio(studentId:string):Promise<PortfolioEvent[]>;
  stars(studentId:string,month:string):Promise<number>;
}

export async function loadStudentLiveView(studentId:string,month:string,reader:StudentLiveReader){
 const [assessments,remediation,portfolio,monthlyStars]=await Promise.all([
  reader.assessments(studentId),reader.remediation(studentId),reader.portfolio(studentId),reader.stars(studentId,month)
 ]);
 return buildStudentDashboard({studentId,assessments,remediation,portfolio,monthlyStars});
}
