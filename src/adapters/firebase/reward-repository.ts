import { doc,getDoc,runTransaction } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { RewardRepository } from '../../application/save-comprehensive-assessment';
export class FirestoreRewardRepository implements RewardRepository{
 constructor(private workspaceId:string){}
 private id(studentId:string,month:string){return `${studentId}_${month}`}
 async getMonthlyStars(studentId:string,month:string){const s=await getDoc(doc(firebaseDb(),paths.rewards(this.workspaceId),this.id(studentId,month)));return s.exists()?Number(s.data().stars||0):0}
 async applyAssessmentStars(studentId:string,month:string,assessmentId:string,amount:number){if(amount<=0)return 0;const db=firebaseDb(),ledger=doc(db,paths.rewards(this.workspaceId),this.id(studentId,month)),event=doc(db,paths.rewardEvents(this.workspaceId),assessmentId);return runTransaction(db,async tx=>{const [eventSnap,ledgerSnap]=await Promise.all([tx.get(event),tx.get(ledger)]);if(eventSnap.exists())return 0;const current=ledgerSnap.exists()?Number(ledgerSnap.data().stars||0):0;const earned=Math.max(0,Math.min(amount,30-current));tx.set(event,{assessmentId,studentId,month,stars:earned,createdAt:new Date().toISOString()});if(earned>0)tx.set(ledger,{studentId,month,stars:current+earned},{merge:true});return earned})}
}
