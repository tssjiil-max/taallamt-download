import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';

const base=()=>`workspaces/${WORKSPACE_ID}`;
const monthKey=()=>new Date().toISOString().slice(0,7);
const now=()=>new Date().toISOString();
const uid=(prefix)=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const clampStars=(n)=>Math.max(0,Math.min(30,Number(n)||0));
const jsonBody=(req)=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const items=(snap)=>snap.docs.map(d=>({id:d.id,...d.data()}));
const timeOf=(x)=>String(x.enteredAt||x.createdAt||x.assignedAt||x.startedAt||'');
const desc=(a,b)=>timeOf(b).localeCompare(timeOf(a));
const behaviorChoices={distinguished:{label:'متميز',tone:'positive'},consistent:{label:'مستمر',tone:'positive'},needs_followup:{label:'يحتاج متابعة',tone:'needs_attention'}};

async function studentSnapshot(studentId){
  const db=adminDb(),student=getStudent(studentId);
  if(!student)throw new Error('STUDENT_NOT_FOUND');
  const root=base();
  const ledgerRef=db.doc(`${root}/rewardLedgers/${studentId}_${monthKey()}`);
  const [ledger,profile,assessments,remediation,portfolio,evidence,communications,curriculum,weeklyPlan]=await Promise.all([
    ledgerRef.get(),
    db.doc(`${root}/studentProfiles/${studentId}`).get(),
    db.collection(`${root}/assessments`).where('studentId','==',studentId).get(),
    db.collection(`${root}/remediationPlans`).where('studentId','==',studentId).get(),
    db.collection(`${root}/portfolioEvents`).where('studentId','==',studentId).get(),
    db.collection(`${root}/homeworkEvidence`).where('studentId','==',studentId).get(),
    db.collection(`${root}/communications`).where('studentId','==',studentId).get(),
    db.collection(`${root}/curriculumTargets`).get(),
    db.collection(`${root}/weeklyPlans`).where('publishStatus','==','published').get()
  ]);
  const assessmentRows=items(assessments).sort(desc);
  const needsFollowupCount=assessmentRows.reduce((total,row)=>total+(row.behavior||[]).filter(item=>item?.code==='needs_followup').length,0);
  const evidenceRows=items(evidence).sort(desc);
  const homeworkIds=[...new Set(evidenceRows.map(x=>x.homeworkId).filter(Boolean))];
  const homeworkDocs=homeworkIds.length?await Promise.all(homeworkIds.map(id=>db.doc(`${root}/homework/${id}`).get())):[];
  const homework=homeworkDocs.filter(x=>x.exists).map(x=>({id:x.id,...x.data()})).sort(desc);
  const curriculumRows=items(curriculum);
  const weeklyPlanAll=items(weeklyPlan).filter(x=>x.publishStatus==='published').sort((a,b)=>String(b.weekKey||'').localeCompare(String(a.weekKey||'')));
  const latestWeekKey=weeklyPlanAll[0]?.weekKey;
  const weeklyPlanRows=latestWeekKey?weeklyPlanAll.filter(x=>x.weekKey===latestWeekKey):[];
  return {
    ok:true,student,profile:profile.exists?profile.data():null,month:monthKey(),stars:ledger.exists?clampStars(ledger.data()?.stars):0,
    needsFollowupCount,
    assessments:assessmentRows.slice(0,30),
    remediation:items(remediation).sort(desc).slice(0,20),
    portfolio:items(portfolio).sort(desc).slice(0,30),
    homework,homeworkEvidence:evidenceRows.slice(0,30),
    communications:items(communications).sort(desc).slice(0,30),
    curriculum:curriculumRows,
    weeklyPlan:weeklyPlanRows
  };
}

async function addStar(studentId){
  const db=adminDb(),root=base(),month=monthKey();
  const ledger=db.doc(`${root}/rewardLedgers/${studentId}_${month}`),eventId=uid('manual_star'),event=db.doc(`${root}/rewardEvents/${eventId}`);
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ledger),current=snap.exists?clampStars(snap.data()?.stars):0;
    if(current>=30)return {earned:0,stars:30};
    tx.set(ledger,{studentId,month,stars:current+1,updatedAt:now()},{merge:true});
    tx.set(event,{id:eventId,studentId,month,stars:1,kind:'manual',createdAt:now()});
    return {earned:1,stars:current+1};
  });
}

function validAcademic(body){
  return Array.isArray(body.academic)?body.academic.filter(x=>x&&typeof x.targetId==='string'&&['mastered','needs_practice'].includes(x.result)):[];
}

async function saveAssessment(studentId,body){
  const academic=validAcademic(body);
  if(!academic.length)throw new Error('ASSESSMENT_EMPTY');
  const db=adminDb(),root=base(),timestamp=now(),id=uid('assessment');
  const record={id,studentId,classSessionId:`manual:${timestamp.slice(0,10)}`,sessionDate:timestamp.slice(0,10),enteredAt:timestamp,track:'general',academic,behavior:[]};
  await db.doc(`${root}/assessments/${id}`).set(record);
  return {saved:true,id};
}

async function saveBehavior(studentId,body){
  const choice=behaviorChoices[body.code];if(!choice)throw new Error('BEHAVIOR_INVALID');
  const db=adminDb(),root=base(),timestamp=now(),id=uid('behavior');
  await db.doc(`${root}/assessments/${id}`).set({id,studentId,classSessionId:`manual:${timestamp.slice(0,10)}`,sessionDate:timestamp.slice(0,10),enteredAt:timestamp,track:'general',academic:[],behavior:[{code:body.code,label:choice.label,tone:choice.tone}]});
  return {saved:true,id,label:choice.label};
}

async function saveQuickAssessment(studentId,body){
  const academic=validAcademic(body);
  if(!academic.length)throw new Error('ASSESSMENT_EMPTY');
  const behaviorCode=String(body.behaviorCode||'distinguished');
  const choice=behaviorChoices[behaviorCode];if(!choice)throw new Error('BEHAVIOR_INVALID');
  const db=adminDb(),root=base(),timestamp=now(),id=uid('quick_assessment');
  const record={id,studentId,classSessionId:`manual:${timestamp.slice(0,10)}`,sessionDate:timestamp.slice(0,10),enteredAt:timestamp,track:'general',academic,behavior:[{code:behaviorCode,label:choice.label,tone:choice.tone}],source:'quick_assessment'};
  await db.doc(`${root}/assessments/${id}`).set(record);
  return {saved:true,id,label:choice.label};
}

async function saveAssessmentGroup(studentId,body){
  const assessmentGroup=String(body.assessmentGroup||'');
  if(!['followup','focused'].includes(assessmentGroup))throw new Error('ASSESSMENT_GROUP_INVALID');
  const db=adminDb(),root=base();
  await db.doc(`${root}/studentProfiles/${studentId}`).set({studentId,assessmentGroup,assessmentGroupUpdatedAt:now(),updatedAt:now()},{merge:true});
  return {saved:true,assessmentGroup};
}

async function saveCommunication(studentId,body){
  const map={followup:'متابعة يومية',student_note:'ملاحظة للطالب',guardian_message:'رسالة لولي الأمر',remediation:'خطة علاجية'};
  const reasonCode=String(body.kind||'guardian_message');
  if(!map[reasonCode])throw new Error('COMMUNICATION_KIND_INVALID');
  const summary=String(body.summary||'').trim();if(!summary)throw new Error('TEXT_REQUIRED');
  const db=adminDb(),root=base(),id=uid('communication');
  const record={id,studentId,recipient:'guardian',reasonCode,reason:map[reasonCode],summary,createdAt:now(),status:'recorded'};
  await db.doc(`${root}/communications/${id}`).set(record);
  return {saved:true,id,record};
}

async function saveHomework(studentId,body){
  const title=String(body.title||'').trim();if(!title)throw new Error('TITLE_REQUIRED');
  const instructions=String(body.instructions||'').trim();
  const kind=body.kind==='training'?'training':'homework';
  const db=adminDb(),root=base(),id=uid(kind),evidenceId=`${id}_${studentId}`,timestamp=now();
  const record={id,classId:CLASS_ID,subject:kind==='training'?'تدريب منزلي':'واجب',title,instructions,targetIds:[],assignedAt:timestamp,status:'published',kind};
  const batch=db.batch();
  batch.set(db.doc(`${root}/homework/${id}`),record);
  batch.set(db.doc(`${root}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId,status:'assigned',assignedAt:timestamp});
  await batch.commit();
  return {saved:true,id,record};
}

async function saveStudentProfile(studentId,body){
  const photoDataUrl=String(body.photoDataUrl||'').trim();
  if(photoDataUrl&&!/^data:image\/(png|jpeg|webp);base64,/.test(photoDataUrl))throw new Error('PHOTO_INVALID');
  if(photoDataUrl.length>280000)throw new Error('PHOTO_TOO_LARGE');
  const db=adminDb(),root=base();
  const patch={studentId,updatedAt:now()};
  if(photoDataUrl)patch.photoDataUrl=photoDataUrl;
  if(body.hobbies!==undefined){
    if(!Array.isArray(body.hobbies))throw new Error('HOBBIES_INVALID');
    const hobbies=[...new Set(body.hobbies.map(x=>String(x||'').trim()).filter(Boolean))].slice(0,12);
    if(hobbies.some(x=>x.length>40))throw new Error('HOBBIES_INVALID');
    patch.hobbies=hobbies;
  }
  await db.doc(`${root}/studentProfiles/${studentId}`).set(patch,{merge:true});
  return {saved:true};
}

async function stagingSmoke(){
  previewWriteGuard();
  const db=adminDb(),root=base(),id=uid('__staging_smoke__'),ref=db.doc(`${root}/communications/${id}`),value={id,studentId:'__staging_test__',recipient:'guardian',reasonCode:'smoke',summary:'staging smoke',createdAt:now(),status:'recorded'};
  await ref.set(value);const snap=await ref.get();const readable=snap.exists&&snap.data()?.summary==='staging smoke';await ref.delete();const deleted=!(await ref.get()).exists;
  return {ok:true,firebaseAdmin:true,write:true,read:readable,delete:deleted,productionProtected:process.env.VERCEL_ENV!=='production'};
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'&&String(req.query?.action||'')==='smoke')return res.status(200).json(await stagingSmoke());
    const body=req.method==='GET'?{}:jsonBody(req);
    const studentId=String((req.method==='GET'?req.query?.studentId:body.studentId)||'');
    const student=getStudent(studentId);if(!student)return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    if(req.method==='GET')return res.status(200).json(await studentSnapshot(studentId));
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const action=String(body.action||'');let result;
    if(action==='star')result=await addStar(studentId);
    else if(action==='assessment')result=await saveAssessment(studentId,body);
    else if(action==='behavior')result=await saveBehavior(studentId,body);
    else if(action==='quick_assessment')result=await saveQuickAssessment(studentId,body);
    else if(action==='assessment_group')result=await saveAssessmentGroup(studentId,body);
    else if(['followup','student_note','guardian_message','remediation'].includes(action))result=await saveCommunication(studentId,{...body,kind:action});
    else if(action==='homework'||action==='training')result=await saveHomework(studentId,{...body,kind:action});
    else if(action==='student_profile')result=await saveStudentProfile(studentId,body);
    else return res.status(400).json({ok:false,error:'ACTION_NOT_SUPPORTED'});
    return res.status(200).json({ok:true,...result,state:await studentSnapshot(studentId)});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:message.endsWith('_REQUIRED')||message.endsWith('_EMPTY')||message.endsWith('_INVALID')?400:500;
    console.error('student-state',message);
    return res.status(status).json({ok:false,error:message});
  }
}
