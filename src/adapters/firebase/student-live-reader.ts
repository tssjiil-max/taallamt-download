import { collection,doc,getDoc,getDocs,onSnapshot,query,where } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { ComprehensiveAssessment,PortfolioEvent,RemediationPlan } from '../../core/domain';
import type { StudentLiveReader,StudentLiveSnapshot } from '../../application/student-live-view';
import { FirestoreRewardRepository } from './reward-repository';
export class FirestoreStudentLiveReader implements StudentLiveReader{
 constructor(private workspaceId:string){}
 private async byStudent<T>(path:string,studentId:string){const s=await getDocs(query(collection(firebaseDb(),path),where('studentId','==',studentId)));return s.docs.map(d=>d.data() as T)}
 assessments(id:string){return this.byStudent<ComprehensiveAssessment>(paths.assessments(this.workspaceId),id)}
 remediation(id:string){return this.byStudent<RemediationPlan>(paths.remediation(this.workspaceId),id)}
 portfolio(id:string){return this.byStudent<PortfolioEvent>(paths.portfolio(this.workspaceId),id)}
 stars(id:string,month:string){return new FirestoreRewardRepository(this.workspaceId).getMonthlyStars(id,month)}
 subscribe(studentId:string,month:string,onChange:(snapshot:StudentLiveSnapshot)=>void){const db=firebaseDb();let assessments:ComprehensiveAssessment[]=[];let remediation:RemediationPlan[]=[];let portfolio:PortfolioEvent[]=[];let monthlyStars=0;const emit=()=>onChange({assessments,remediation,portfolio,monthlyStars});const q=<T>(path:string,set:(v:T[])=>void)=>onSnapshot(query(collection(db,path),where('studentId','==',studentId)),s=>{set(s.docs.map(d=>d.data() as T));emit()});const stops=[q<ComprehensiveAssessment>(paths.assessments(this.workspaceId),v=>assessments=v),q<RemediationPlan>(paths.remediation(this.workspaceId),v=>remediation=v),q<PortfolioEvent>(paths.portfolio(this.workspaceId),v=>portfolio=v),onSnapshot(doc(db,paths.rewards(this.workspaceId),`${studentId}_${month}`),s=>{monthlyStars=s.exists()?Number(s.data().stars||0):0;emit()})];return ()=>stops.forEach(stop=>stop())}
}
