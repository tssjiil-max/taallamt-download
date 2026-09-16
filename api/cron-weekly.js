import {publishWeeklyPlan,seedCurriculum} from './learning-automation.js';
import {weekNumberForDate} from '../server/learning-content.js';

function authorized(req){const secret=process.env.CRON_SECRET?.trim();return !secret||String(req.headers?.authorization||'')===`Bearer ${secret}`}
export default async function handler(req,res){
  if(!authorized(req))return res.status(401).json({ok:false,error:'CRON_UNAUTHORIZED'});
  try{
    const curriculum=await seedCurriculum();
    const nextSchoolWeek=new Date(Date.now()+86400000);
    const weekly=await publishWeeklyPlan(weekNumberForDate(nextSchoolWeek));
    return res.status(200).json({ok:true,curriculum,weekly});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
