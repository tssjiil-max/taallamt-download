import {remediationSuggestions,syncRemediationPlans} from '../server/remediation-automation.js';
import {accessFailure,requireTeacher} from '../server/access.js';

export default async function handler(req,res){
  try{
    if(req.method==='GET'){requireTeacher(req);return res.status(200).json({ok:true,suggestions:await remediationSuggestions()})}
    if(req.method==='POST'){requireTeacher(req,{write:true});return res.status(200).json({ok:true,...await syncRemediationPlans()})}
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }catch(error){if(accessFailure(res,error))return;return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
