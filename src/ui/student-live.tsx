import React from 'react';
import type { StudentProjection } from '../core/student-projection';

export interface StudentLiveVM {studentId:string;stars:{current:number;max:number};focusedFollowup:boolean;latestResults:StudentProjection['latestAssessments'];activeRemediation:StudentProjection['activeRemediation'];achievements:StudentProjection['portfolio']}
export function StudentLive({data}:{data:StudentLiveVM}){
 return <section><div className="hero"><h2>متابعتي</h2><div className="stars">⭐ {data.stars.current} / {data.stars.max}</div>{data.focusedFollowup&&<p>لديك تدريب إضافي يساعدك على الإتقان 💪</p>}</div>
 <h3>آخر النتائج</h3>{data.latestResults.length===0?<p>لا يوجد تقييم مسجل بعد.</p>:data.latestResults.map(a=><article className="result" key={a.id}>{a.academic.map(x=><div key={x.targetId}><strong>{x.targetId}</strong> — {x.result==='mastered'?'أتقن':x.result==='needs_practice'?'يحتاج تدريب':'لم يتقن'}</div>)}</article>)}
 {data.activeRemediation.length>0&&<><h3>تدريبي الحالي</h3>{data.activeRemediation.map(p=><article key={p.id}>خطة تدريب: {p.targetId}</article>)}</>}
 </section>
}
