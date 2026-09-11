import { WeeklyPlanItem } from './session';

export function publishableWeeklyPlan(items:WeeklyPlanItem[],today:Date):WeeklyPlanItem[]{
 const isSaturday=today.getDay()===6;
 if(!isSaturday) return items;
 return items.map(item=>item.publishStatus==='ready'&&item.publishOnSaturday?{...item,publishStatus:'published'}:item);
}

export function visibleStudentPlan(items:WeeklyPlanItem[]){
 return items.filter(i=>i.publishStatus==='published');
}

// المسودة غير المكتملة لا تظهر للطالب مطلقًا.
