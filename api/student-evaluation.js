import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID} from '../server/class-roster.js';

const base=()=>`workspaces/${WORKSPACE_ID}`;
const now=()=>new Date().toISOString();
const uid=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const jsonBody=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const academicResults=['mastered','needs_practice'];
const behaviorChoices={distinguished:{label:'متميز',tone:'positive'},consistent:{label:'مستمر',tone:'positive'},needs_followup:{label:'يحتاج متابعة',tone:'needs_attention'}};

function cleanValues(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.map(item=>String(item||'').trim()).filter(Boolean))].slice(0,8);
}

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=jsonBody(req),studentId=String(body.studentId||'');
    if(!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    const action=String(body.action||''),db=adminDb(),root=base(),timestamp=now(),id=uid('evaluation');
    let record;

    if(action==='academic'){
      const targetId=String(body.targetId||'').trim(),result=String(body.result||'');
      if(!targetId||!academicResults.includes(result))return res.status(400).json({ok:false,error:'ASSESSMENT_INVALID'});
      record={id,studentId,classSessionId:`manual:${timestamp.slice(0,10)}`,sessionDate:timestamp.slice(0,10),enteredAt:timestamp,track:'general',academic:[{targetId,result}],behavior:[],source:'teacher_evaluation_extension'};
    }else if(action==='value'){
      const choice=behaviorChoices[String(body.code||'')],valueNames=cleanValues(body.valueNames);
      if(!choice)return res.status(400).json({ok:false,error:'VALUE_STATUS_INVALID'});
      if(!valueNames.length)return res.status(400).json({ok:false,error:'VALUE_REQUIRED'});
      record={id,studentId,classSessionId:`manual:${timestamp.slice(0,10)}`,sessionDate:timestamp.slice(0,10),enteredAt:timestamp,track:'general',academic:[],behavior:valueNames.map(valueName=>({kind:'value',valueName,code:String(body.code),label:choice.label,tone:choice.tone})),source:'teacher_value_evaluation'};
    }else return res.status(400).json({ok:false,error:'ACTION_NOT_SUPPORTED'});

    await db.doc(`${root}/assessments/${id}`).set(record);
    return res.status(200).json({ok:true,saved:true,id});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:500;
    console.error('student-evaluation',message);
    return res.status(status).json({ok:false,error:message});
  }
}
