export type ReferralTarget='counselor'|'vice_principal';
export interface Referral {id:string;studentId:string;target:ReferralTarget;reasonCode:string;summary:string;createdAt:string;status:'prepared'|'sent'|'acknowledged'|'closed';sourceIds:string[]}
export function prepareReferral(input:Omit<Referral,'status'>):Referral{return {...input,status:'prepared'}}
export function closeReferral(referral:Referral):Referral{return {...referral,status:'closed'}}
