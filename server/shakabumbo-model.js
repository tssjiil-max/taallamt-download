import {readTutorLesson,requirePilot} from './learning-pilot.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
 try{
  requirePilot();const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(typeof body.question!=='string'||body.question.length>240||!body.question.trim())return res.status(400).json({error:'QUESTION_INVALID'});
  // Fetch only the authorized public lesson; never trust client-authored lesson text.
  const context=await readTutorLesson(req,body);
  if(!['arabic','spelling','handwriting'].includes(context.subject))return res.status(403).json({error:'SUBJECT_BLOCKED'});
  const url=process.env.SHAK_MODEL_URL,token=process.env.SHAK_SERVICE_TOKEN;
  if(!url||!token)return res.status(503).json({error:'MODEL_NOT_CONFIGURED'});
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({context,question:body.question,history:Array.isArray(body.history)?body.history.slice(-4).map(t=>({role:t.role,content:String(t.content||'').slice(0,350)})):[]}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok)return res.status(response.status).json({error:result.error||'MODEL_UNAVAILABLE'});
  return res.json({reply:result.reply,model:result.model});
 }catch(e){return res.status(e.status||503).json({error:e.code||'MODEL_UNAVAILABLE'})}
}
