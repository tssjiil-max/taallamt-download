import type { ComprehensiveAssessment } from './domain';
export type ReferralRecommendation='none'|'guardian_contact'|'counselor'|'vice_principal';
const serious=new Set(['left_class']);
export function referralRecommendation(studentId:string,assessments:ComprehensiveAssessment[]):ReferralRecommendation{
 const recent=assessments.filter(a=>a.studentId===studentId).sort((a,b)=>b.sessionDate.localeCompare(a.sessionDate)).slice(0,5);
 const attention=recent.flatMap(a=>a.behavior).filter(b=>b.tone==='needs_attention');
 if(attention.some(b=>serious.has(b.code))&&attention.length>=2)return 'vice_principal';
 if(attention.length>=3)return 'counselor';
 if(attention.length>=2)return 'guardian_contact';
 return 'none';
}
// التوصية لا ترسل شيئًا تلقائيًا؛ القرار والتنفيذ بيد المعلم.
