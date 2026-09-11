import type { WeeklyPlanItem } from '../core/session';
import { publishableWeeklyPlan } from '../core/weekly-plan-engine';

export interface WeeklyPlanWriter { save(item:WeeklyPlanItem):Promise<void> }
export async function publishSaturdayPlan(items:WeeklyPlanItem[],today:Date,writer:WeeklyPlanWriter){
 const next=publishableWeeklyPlan(items,today);
 const changed=next.filter((x,i)=>x.publishStatus!==items[i].publishStatus);
 await Promise.all(changed.map(x=>writer.save(x)));
 return next;
}
