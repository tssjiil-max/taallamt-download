import {publishDailyHomework} from './learning-automation.js';
import {syncRemediationPlans} from '../server/remediation-automation.js';

function authorized(req){const secret=process.env.CRON_SECRET?.trim();return !secret||String(req.headers?.authorization||'')===`Bearer ${secret}`}
export default async function handler(req,res){
  if(!authorized(req))return res.status(401).json({ok:false,error:'CRON_UNAUTHORIZED'});
  try{
    const remediation=await syncRemediationPlans();
    const homework=await publishDailyHomework();
    return res.status(200).json({ok:true,remediation,homework});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
