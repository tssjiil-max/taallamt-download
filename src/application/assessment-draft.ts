import type { Mastery, BehaviorItem, ComprehensiveAssessment } from '../core/domain';

export interface StudentAssessmentDraft {
 studentId:string;
 academic:Map<string,Mastery>;
 behavior:BehaviorItem[];
}

export function emptyDraft(studentId:string):StudentAssessmentDraft{return {studentId,academic:new Map(),behavior:[]}}
export function setAcademicResult(draft:StudentAssessmentDraft,targetId:string,result:Mastery):StudentAssessmentDraft{
 const academic=new Map(draft.academic);academic.set(targetId,result);return {...draft,academic};
}
export function finalizeDraft(draft:StudentAssessmentDraft,input:{assessmentId:string;sessionId:string;sessionDate:string;enteredAt:string}):ComprehensiveAssessment|null{
 if(draft.academic.size===0&&draft.behavior.length===0)return null;
 return {id:input.assessmentId,studentId:draft.studentId,classSessionId:input.sessionId,sessionDate:input.sessionDate,enteredAt:input.enteredAt,track:'general',academic:[...draft.academic].map(([targetId,result])=>({targetId,result})),behavior:draft.behavior};
}
// الطالب الذي لم يختر له المعلم نتيجة يبقى "غير مقيم" ولا يتحول إلى لم يتقن.
