import React from 'react';
import type { Mastery } from '../core/domain';

export interface AssessmentStudentRow { id:string; name:string; result?:Mastery }
export function AssessmentScreen({students,onChange}:{students:AssessmentStudentRow[];onChange:(id:string,result:Mastery)=>void}){
 return <section><h2>التقويم الشامل اليومي</h2><p>اختر النتيجة فقط للطلاب الذين تم تقييمهم فعليًا.</p>
 {students.map(s=><div className="assessment-row" key={s.id}><strong>{s.name}</strong><div>
  <button onClick={()=>onChange(s.id,'mastered')}>أتقن</button>
  <button onClick={()=>onChange(s.id,'needs_practice')}>يحتاج تدريب</button>
  <button onClick={()=>onChange(s.id,'not_mastered')}>لم يتقن</button>
 </div></div>)}</section>
}
