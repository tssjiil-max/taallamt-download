import {runScheduled} from './learning-automation.js';
import {syncRemediationPlans} from '../server/remediation-automation.js';
import {schedulerAuthorized} from '../server/scheduler-auth.mjs';

// Scheduled by vercel.json: 02:00 UTC Sunday-Thursday = 05:00 Asia/Riyadh, before school.
// With CRON_SECRET set, only Vercel's scheduler can call it. The response never carries student data, only counts.
export default async function handler(req,res){
  if(!await schedulerAuthorized(req))return res.status(401).json({ok:false,error:'CRON_UNAUTHORIZED'});
  try{
    const remediation=await syncRemediationPlans();
    const run=await runScheduled('cron-daily');
    const daily=run.daily||{};
    return res.status(200).json({ok:true,week:run.week,weeklyPublished:Boolean(run.weeklyPublished),skipped:daily.reason||null,localDate:daily.localDate||null,
      homework:(daily.created||[]).map(item=>({id:item.id,subject:item.subject,duplicate:Boolean(item.duplicate)})),gaps:(daily.gaps||[]).length,
      remediation:{created:Array.isArray(remediation?.created)?remediation.created.length:0}});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
