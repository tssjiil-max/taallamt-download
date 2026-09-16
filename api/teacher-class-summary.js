import {adminDb} from '../server/firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const monthKey=()=>new Date().toISOString().slice(0,7);
const clampStars=value=>Math.max(0,Math.min(30,Number(value)||0));
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const studentIds=new Set(CLASS_STUDENTS.map(student=>student.id));
const cache=new Map();
const inflight=new Map();
const ttlFor=view=>view==='stars'?15000:60000;

function studentMap(){return new Map(CLASS_STUDENTS.map(student=>[student.id,student]));}
function timeOf(item){return String(item?.createdAt||item?.enteredAt||item?.assignedAt||'');}
function latestFirst(a,b){return timeOf(b).localeCompare(timeOf(a));}

async function buildMessages(){
  const db=adminDb();
  const snap=await db.collection(`${root()}/communications`).where('reasonCode','==','guardian_message').get();
  const grouped=new Map();
  for(const item of rows(snap).sort(latestFirst)){
    if(!studentIds.has(item.studentId))continue;
    const current=grouped.get(item.studentId)||{count:0,latest:null};
    current.count+=1;if(!current.latest)current.latest=item;grouped.set(item.studentId,current);
  }
  const students=CLASS_STUDENTS.filter(student=>grouped.has(student.id)).map(student=>({student,...grouped.get(student.id)}));
  return {ok:true,view:'messages',students,total:students.reduce((sum,row)=>sum+row.count,0)};
}

async function buildFollowup(){
  const db=adminDb();
  const [communications,assessments]=await Promise.all([
    db.collection(`${root()}/communications`).where('reasonCode','in',['followup','remediation']).get(),
    db.collection(`${root()}/assessments`).get()
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
  return {ok:true,view:'followup',students,total:students.length};
}

async function buildStars(){
  const db=adminDb(),month=monthKey();
  const refs=CLASS_STUDENTS.map(student=>db.doc(`${root()}/rewardLedgers/${student.id}_${month}`));
  const docs=refs.length?await db.getAll(...refs):[];
  const students=CLASS_STUDENTS.map((student,index)=>({student,stars:docs[index]?.exists?clampStars(docs[index].data()?.stars):0}));
  return {ok:true,view:'stars',month,students,total:students.length};
}

async function build(view){
  if(view==='messages')return buildMessages();
  if(view==='followup')return buildFollowup();
  if(view==='stars')return buildStars();
  throw new Error('VIEW_INVALID');
}

async function cached(view){
  const hit=cache.get(view),ttl=ttlFor(view);
  if(hit&&Date.now()-hit.at<ttl)return hit.value;
  if(inflight.has(view))return inflight.get(view);
  const promise=build(view).then(value=>{cache.set(view,{at:Date.now(),value});return value}).finally(()=>inflight.delete(view));
  inflight.set(view,promise);return promise;
}

export default async function handler(req,res){
  try{
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const view=String(req.query?.view||'');
    res.setHeader('Cache-Control','private, max-age=0, no-store');
    return res.status(200).json(await cached(view));
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    return res.status(message==='VIEW_INVALID'?400:500).json({ok:false,error:message});
  }
}
