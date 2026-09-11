import type { CommunicationEvent,CommunicationRecipient } from './communication';
export interface ReferralRecord{id:string;studentId:string;recipient:Exclude<CommunicationRecipient,'guardian'>;reasonCode:string;summary:string;createdAt:string;status:'prepared'|'referred'|'closed'}
export function communicationEvent(input:Omit<CommunicationEvent,'status'>):CommunicationEvent{return {...input,status:'prepared'}}
export function referralRecord(studentId:string,recipient:ReferralRecord['recipient'],reasonCode:string,summary:string,createdAt:string):ReferralRecord{return {id:`referral:${studentId}:${createdAt}`,studentId,recipient,reasonCode,summary,createdAt,status:'prepared'}}
