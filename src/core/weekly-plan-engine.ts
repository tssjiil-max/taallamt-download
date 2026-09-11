import { WeeklyPlanItem } from './session';
function riyadhWeekday(now:Date){return new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',weekday:'short'}).format(now)}
export function publishableWeeklyPlan(items:WeeklyPlanItem[],today:Date):WeeklyPlanItem[]{
 if(riyadhWeekday(today)!=='Sat')return items;
 return items.map(item=>item.publishStatus==='ready'&&item.publishOnSaturday?{...item,publishStatus:'published'}:item);
}
export function visibleStudentPlan(items:WeeklyPlanItem[]){return items.filter(i=>i.publishStatus==='published')}
// المسودة غير المكتملة لا تظهر للطالب مطلقًا، والنشر الأسبوعي يعتمد توقيت السعودية.
