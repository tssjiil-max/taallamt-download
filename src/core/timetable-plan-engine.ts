import type { TimetableEntry } from './session';
import type { CurriculumTarget } from './domain';
export interface LearningSlot {weekday:number;period:number;subject:CurriculumTarget['subject'];targetIds:string[]}
export function buildLearningSlots(timetable:TimetableEntry[],targets:CurriculumTarget[]):LearningSlot[]{
 const queues=new Map<string,string[]>();for(const t of targets){const q=queues.get(t.subject)??[];q.push(t.id);queues.set(t.subject,q)}
 return [...timetable].sort((a,b)=>a.weekday-b.weekday||a.period-b.period).map(x=>({weekday:x.weekday,period:x.period,subject:x.subject,targetIds:(queues.get(x.subject)??[]).splice(0,1)}));
}
