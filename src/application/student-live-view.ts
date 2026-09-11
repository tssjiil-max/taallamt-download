import type { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from '../core/domain';
import { buildStudentDashboard } from './student-dashboard';
export interface StudentLiveSnapshot{assessments:ComprehensiveAssessment[];remediation:RemediationPlan[];portfolio:PortfolioEvent[];monthlyStars:number}
export interface StudentLiveReader{
 assessments(studentId:string):Promise<ComprehensiveAssessment[]>;remediation(studentId:string):Promise<RemediationPlan[]>;portfolio(studentId:string):Promise<PortfolioEvent[]>;stars(studentId:string,month:string):Promise<number>;
 subscribe?(studentId:string,month:string,onChange:(snapshot:StudentLiveSnapshot)=>void):()=>void;
}
export async function loadStudentLiveView(studentId:string,month:string,reader:StudentLiveReader){const [assessments,remediation,portfolio,monthlyStars]=await Promise.all([reader.assessments(studentId),reader.remediation(studentId),reader.portfolio(studentId),reader.stars(studentId,month)]);return buildStudentDashboard({studentId,assessments,remediation,portfolio,monthlyStars})}
export function subscribeStudentLiveView(studentId:string,month:string,reader:StudentLiveReader,onChange:(view:ReturnType<typeof buildStudentDashboard>)=>void){if(!reader.subscribe)throw new Error('REALTIME_NOT_SUPPORTED');return reader.subscribe(studentId,month,s=>onChange(buildStudentDashboard({studentId,assessments:s.assessments,remediation:s.remediation,portfolio:s.portfolio,monthlyStars:s.monthlyStars})))}
