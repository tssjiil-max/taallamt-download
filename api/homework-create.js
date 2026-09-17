import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';
import {createAutoGradingConfig,gradingSecretFromEnv} from '../server/homework-autograde.mjs';

const now=()=>new Date().toISOString();
const uid=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const jsonBody=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const acceptedAnswers=value=>Array.isArray(value)?value:String(value||'').split(/[\n,،]+/).map(x=>x.trim()).filter(Boolean);

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=jsonBody(req),studentId=String(body.studentId||'');
    if(!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    const title=String(body.title||'').trim();if(!title)return res.status(400).json({ok:false,error:'TITLE_REQUIRED'});
    const instructions=String(body.instructions||'').trim().slice(0,2000);
    const kind=body.kind==='training'?'training':'homework';
    const answerKey=String(body.answerKey||'').trim().slice(0,500);
    const alternatives=acceptedAnswers(body.acceptedAnswers).slice(0,12).map(x=>String(x).slice(0,500));
    const maxScore=Math.min(100,Math.max(1,Number(body.maxScore)||10));
    const autoGrading=answerKey?createAutoGradingConfig({answerKey,acceptedAnswers:alternatives,maxScore},gradingSecretFromEnv()):null;
    const db=adminDb(),root=`workspaces/${WORKSPACE_ID}`,id=uid(kind),evidenceId=`${id}_${studentId}`,timestamp=now();
    const record={id,classId:CLASS_ID,subject:kind==='training'?'تدريب منزلي':'واجب',title,instructions,targetIds:[],assignedAt:timestamp,status:'published',kind,...(autoGrading?{autoGrading}:{})};
    const batch=db.batch();
    batch.set(db.doc(`${root}/homework/${id}`),record);
    batch.set(db.doc(`${root}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId,status:'assigned',assignedAt:timestamp,maxScore:autoGrading?.maxScore||maxScore,autoGradingEnabled:Boolean(autoGrading)});
    await batch.commit();
    return res.status(200).json({ok:true,id,autoGradingEnabled:Boolean(autoGrading),maxScore:autoGrading?.maxScore||maxScore,record:{...record,autoGrading:autoGrading?{enabled:true,mode:autoGrading.mode,maxScore:autoGrading.maxScore}:undefined}});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:500;
    console.error('homework-create',message);
    return res.status(status).json({ok:false,error:message});
  }
}
