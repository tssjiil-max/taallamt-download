import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { RewardRepository } from '../../application/save-comprehensive-assessment';

export class FirestoreRewardRepository implements RewardRepository {
 constructor(private workspaceId:string){}
 private id(studentId:string,month:string){return `${studentId}_${month}`}
 async getMonthlyStars(studentId:string,month:string){const s=await getDoc(doc(firebaseDb(),paths.rewards(this.workspaceId),this.id(studentId,month)));return s.exists()?Number(s.data().stars||0):0}
 async addStars(studentId:string,month:string,amount:number){const current=await this.getMonthlyStars(studentId,month);await setDoc(doc(firebaseDb(),paths.rewards(this.workspaceId),this.id(studentId,month)),{studentId,month,stars:Math.min(30,current+amount)},{merge:true})}
}
