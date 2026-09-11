import React from 'react';
import type { Mastery, Student } from '../core/domain';
import { emptyDraft, finalizeDraft, setAcademicResult, type StudentAssessmentDraft } from '../application/assessment-draft';

export function TeacherAssessment({students,targetId,sessionId,onSave}:{students:Student[];targetId:string;sessionId:string;onSave:(items:ReturnType<typeof finalizeDraft>[])=>Promise<void>}){
 const [drafts,setDrafts]=React.useState<Record<string,StudentAssessmentDraft>>(()=>Object.fromEntries(students.map(s=>[s.id,emptyDraft(s.id)])));
 const choose=(studentId:string,result:Mastery)=>setDrafts(d=>({...d,[studentId]:setAcademicResult(d[studentId]??emptyDraft(studentId),targetId,result)}));
 const save=async()=>{const now=new Date().toISOString();const date=now.slice(0,10);const items=students.map((s,i)=>finalizeDraft(drafts[s.id]??emptyDraft(s.id),{assessmentId:`${sessionId}:${s.id}:${i}`,sessionId,sessionDate:date,enteredAt:now})).filter(Boolean);await onSave(items)};
 return <section><h2>التقويم الشامل</h2><p>المهارة الحالية: {targetId}</p>{students.map(s=><div className="assessment-row" key={s.id}><strong>{s.fullName}</strong><div><button onClick={()=>choose(s.id,'mastered')}>أتقن</button><button onClick={()=>choose(s.id,'needs_practice')}>يحتاج تدريب</button><button onClick={()=>choose(s.id,'not_mastered')}>لم يتقن</button></div></div>)}<button onClick={save}>حفظ التقييمات المحددة</button></section>
}
