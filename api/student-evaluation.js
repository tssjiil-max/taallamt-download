import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,CLASS_STUDENTS,WORKSPACE_ID} from '../server/class-roster.js';

const base=()=>`workspaces/${WORKSPACE_ID}`;
const now=()=>new Date().toISOString();
const monthKey=()=>new Date().toISOString().slice(0,7);
const uid=prefix=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const jsonBody=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const academicResults=['mastered','needs_practice','not_mastered'];
const behaviorChoices={distinguished:{label:'متميز',tone:'positive'},consistent:{label:'مستمر',tone:'positive'},needs_followup:{label:'يحتاج متابعة',tone:'needs_attention'}};
const clampStars=value=>Math.max(0,Math.min(30,Number(value)||0));
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const studentIds=new Set(CLASS_STUDENTS.map(student=>student.id));
const summaryCache=new Map();
const summaryInflight=new Map();
const ttlFor=view=>view==='class_stars'?15000:60000;
const timeOf=item=>String(item?.createdAt||item?.enteredAt||item?.assignedAt||'');
const latestFirst=(a,b)=>timeOf(b).localeCompare(timeOf(a));

function cleanValues(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.map(item=>String(item||'').trim()).filter(Boolean))].slice(0,8);
}

async function classMessages(){
  const db=adminDb();
  const snap=await db.collection(`${base()}/communications`).where('reasonCode','==','guardian_message').get();
  const grouped=new Map();
  for(const item of rows(snap).sort(latestFirst)){
    if(!studentIds.has(item.studentId))continue;
    const current=grouped.get(item.studentId)||{count:0,latest:null};
    current.count+=1;if(!current.latest)current.latest=item;grouped.set(item.studentId,current);
  }
  const students=CLASS_STUDENTS.filter(student=>grouped.has(student.id)).map(student=>({student,...grouped.get(student.id)}));
  return {ok:true,view:'class_messages',students,total:students.reduce((sum,row)=>sum+row.count,0)};
}

async function classFollowup(){
  const db=adminDb();
  const [communications,assessments]=await Promise.all([
    db.collection(`${base()}/communications`).where('reasonCode','in',['followup','remediation']).get(),
    db.collection(`${base()}/assessments`).get()
  ]);
  const latestCommunication=new Map();
  for(const item of rows(communications).sort(latestFirst)){
    if(studentIds.has(item.studentId)&&!latestCommunication.has(item.studentId))latestCommunication.set(item.studentId,item);
  }
  const behaviorFollowup=new Set();
  for(const assessment of rows(assessments)){
    if(!studentIds.has(assessment.studentId))continue;
    if((assessment.behavior||[]).some(item=>item?.code==='needs_followup'||item?.label==='يحتاج متابعة'))behaviorFollowup.add(assessment.studentId);
  }
  const students=CLASS_STUDENTS.filter(student=>latestCommunication.has(student.id)||behaviorFollowup.has(student.id)).map(student=>({student,latestFollowup:latestCommunication.get(student.id)||null,behaviorNeedsFollowup:behaviorFollowup.has(student.id)}));
  return {ok:true,view:'class_followup',students,total:students.length};
}

async function classStars(){
  const db=adminDb(),month=monthKey();
  const refs=CLASS_STUDENTS.map(student=>db.doc(`${base()}/rewardLedgers/${student.id}_${month}`));
  const docs=refs.length?await db.getAll(...refs):[];
  const students=CLASS_STUDENTS.map((student,index)=>({student,stars:docs[index]?.exists?clampStars(docs[index].data()?.stars):0}));
  return {ok:true,view:'class_stars',month,students,total:students.length};
}

async function classSummary(view){
  const hit=summaryCache.get(view),ttl=ttlFor(view);
  if(hit&&Date.now()-hit.at<ttl)return hit.value;
  if(summaryInflight.has(view))return summaryInflight.get(view);
  const loader=view==='class_messages'?classMessages:view==='class_followup'?classFollowup:view==='class_stars'?classStars:null;
  if(!loader)throw new Error('VIEW_INVALID');
  const promise=loader().then(value=>{summaryCache.set(view,{at:Date.now(),value});return value}).finally(()=>summaryInflight.delete(view));
  summaryInflight.set(view,promise);return promise;
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'){
      const view=String(req.query?.view||'');
      if(!view.startsWith('class_'))return res.status(400).json({ok:false,error:'VIEW_INVALID'});
      res.setHeader('Cache-Control','private, max-age=0, no-store');
      return res.status(200).json(await classSummary(view));
    }
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
    summaryCache.delete('class_followup');
    return res.status(200).json({ok:true,saved:true,id});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:message==='VIEW_INVALID'?400:500;
    console.error('student-evaluation',message);
    return res.status(status).json({ok:false,error:message});
  }
}
