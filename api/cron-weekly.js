import {publishWeeklyPlan,recordAutomationRun,seedCurriculum} from './learning-automation.js';
import {termPhase,weekNumberForDate} from '../server/learning-content.js';

// Scheduled by vercel.json: 05:00 UTC Saturday = 08:00 Asia/Riyadh. Publishes the plan of the school week that starts on Sunday.
function authorized(req){const secret=process.env.CRON_SECRET?.trim();return !secret||String(req.headers?.authorization||'')===`Bearer ${secret}`}
export default async function handler(req,res){
  if(!authorized(req))return res.status(401).json({ok:false,error:'CRON_UNAUTHORIZED'});
  try{
    const nextSchoolWeek=new Date(Date.now()+86400000);
    if(termPhase(nextSchoolWeek)!=='during')return res.status(200).json({ok:true,skipped:'OUTSIDE_TERM'});
    const curriculum=await seedCurriculum();
    const weekly=await publishWeeklyPlan(weekNumberForDate(nextSchoolWeek));
    await recordAutomationRun('cron-weekly',{weekly});
    return res.status(200).json({ok:true,curriculum,weekly:{saved:weekly.saved,week:weekly.week,created:weekly.created,updated:weekly.updated}});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
