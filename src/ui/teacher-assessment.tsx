import React from 'react';
import type { Mastery, Student } from '../core/domain';
import { emptyDraft, finalizeDraft, setAcademicResult, type StudentAssessmentDraft } from '../application/assessment-draft';

export function TeacherAssessment({students,targetId,targetLabel,sessionId,sessionDate,onSave}:{students:Student[];targetId:string;targetLabel:string;sessionId:string;sessionDate:string;onSave:(items:ReturnType<typeof finalizeDraft>[])=>Promise<void>}){
 const [drafts,setDrafts]=React.useState<Record<string,StudentAssessmentDraft>>(()=>Object.fromEntries(students.map(s=>[s.id,emptyDraft(s.id)])));
 const [saving,setSaving]=React.useState(false);const [saved,setSaved]=React.useState<number|null>(null);
 React.useEffect(()=>setDrafts(Object.fromEntries(students.map(s=>[s.id,emptyDraft(s.id)]))),[students,targetId,sessionId]);
 const choose=(studentId:string,result:Mastery)=>setDrafts(d=>({...d,[studentId]:setAcademicResult(d[studentId]??emptyDraft(studentId),targetId,result)}));
 const save=async()=>{setSaving(true);setSaved(null);try{const now=new Date().toISOString();const items=students.map(s=>finalizeDraft(drafts[s.id]??emptyDraft(s.id),{assessmentId:`${sessionId}:${s.id}:${targetId}`,sessionId,sessionDate,enteredAt:now})).filter((x):x is NonNullable<typeof x>=>x!==null);await onSave(items);setSaved(items.length)}finally{setSaving(false)}};
 return <section><h2>التقويم الشامل</h2><p>{targetLabel}</p>{students.map(s=><div className="assessment-row" key={s.id}><strong>{s.fullName}</strong><div><button onClick={()=>choose(s.id,'mastered')}>أتقن</button><button onClick={()=>choose(s.id,'needs_practice')}>يحتاج تدريب</button><button onClick={()=>choose(s.id,'not_mastered')}>لم يتقن</button></div></div>)}<button disabled={saving} onClick={save}>{saving?'جارٍ الحفظ…':'حفظ التقييمات المحددة'}</button>{saved!==null&&<p>تم حفظ {saved} تقييمًا.</p>}</section>
}
