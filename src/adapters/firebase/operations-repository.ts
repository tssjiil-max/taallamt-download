import { collection,doc,getDocs,query,setDoc,where } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { CommunicationEvent } from '../../core/communication';
import type { ReferralRecord } from '../../core/communication-log';
export interface StudentDeviceRecord{id:string;studentId:string;label?:string;lastSeenAt:string;revokedAt?:string}
export interface StudentAccessGrant{id:string;studentId:string;createdAt:string;revokedAt?:string}
export class FirestoreOperationsRepository{constructor(private workspaceId:string){}private db(){return firebaseDb()}async saveCommunication(v:CommunicationEvent){await setDoc(doc(this.db(),paths.communications(this.workspaceId),v.id),v,{merge:true})}async listCommunications(studentId:string){const s=await getDocs(query(collection(this.db(),paths.communications(this.workspaceId)),where('studentId','==',studentId)));return s.docs.map(d=>d.data() as CommunicationEvent)}async saveReferral(v:ReferralRecord){await setDoc(doc(this.db(),paths.referrals(this.workspaceId),v.id),v,{merge:true})}async saveDevice(v:StudentDeviceRecord){await setDoc(doc(this.db(),paths.devices(this.workspaceId),v.id),v,{merge:true})}async saveAccessGrant(v:StudentAccessGrant){await setDoc(doc(this.db(),paths.accessGrants(this.workspaceId),v.id),v,{merge:true})}}
