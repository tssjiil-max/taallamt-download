import { collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { ComprehensiveAssessment, PortfolioEvent, RemediationPlan } from '../../core/domain';
import type { StudentLiveReader } from '../../application/student-live-view';
import { FirestoreRewardRepository } from './reward-repository';

export class FirestoreStudentLiveReader implements StudentLiveReader {
 constructor(private workspaceId:string){}
 private async byStudent<T>(path:string,studentId:string){const s=await getDocs(query(collection(firebaseDb(),path),where('studentId','==',studentId)));return s.docs.map(d=>d.data() as T)}
 assessments(id:string){return this.byStudent<ComprehensiveAssessment>(paths.assessments(this.workspaceId),id)}
 remediation(id:string){return this.byStudent<RemediationPlan>(paths.remediation(this.workspaceId),id)}
 portfolio(id:string){return this.byStudent<PortfolioEvent>(paths.portfolio(this.workspaceId),id)}
 stars(id:string,month:string){return new FirestoreRewardRepository(this.workspaceId).getMonthlyStars(id,month)}
}
