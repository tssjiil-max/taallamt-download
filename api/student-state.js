import {createHash,randomBytes} from 'node:crypto';
import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';
import {createAutoGradingConfig,gradeHomeworkAnswer,gradingSecretFromEnv,publicAutoGradingConfig} from '../server/homework-autograde.js';

const base=()=>`workspaces/${WORKSPACE_ID}`;
const monthKey=()=>new Date().toISOString().slice(0,7);
const now=()=>new Date().toISOString();
const uid=(prefix)=>`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
const clampStars=(n)=>Math.max(0,Math.min(30,Number(n)||0));
const jsonBody=(req)=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const acceptedHomeworkAnswers=value=>Array.isArray(value)?value:String(value||'').split(/[\n,،]+/).map(x=>x.trim()).filter(Boolean);
const items=(snap)=>snap.docs.map(d=>({id:d.id,...d.data()}));
const timeOf=(x)=>String(x.enteredAt||x.createdAt||x.assignedAt||x.startedAt||'');
const desc=(a,b)=>timeOf(b).localeCompare(timeOf(a));
const behaviorChoices={distinguished:{label:'متميز',tone:'positive'},consistent:{label:'مستمر',tone:'positive'},needs_followup:{label:'يحتاج متابعة',tone:'needs_attention'}};
const MAX_GUARDIAN_DEVICES=2;
const accessToken=()=>randomBytes(24).toString('base64url');
const hashToken=(value)=>createHash('sha256').update(String(value||'')).digest('hex');
const validAccessToken=(value)=>typeof value==='string'&&value.length>=20&&value.length<=200;
const normalizeGuardianDevices=(profile)=>Array.isArray(profile?.guardianDevices)?profile.guardianDevices.filter(x=>x&&typeof x.tokenHash==='string').slice(0,MAX_GUARDIAN_DEVICES):[];
function sanitizeProfile(data){
  if(!data)return null;
  const {guardianInviteToken,guardianDevices,...safe}=data;
  return safe;
}
const cleanText=value=>String(value||'').trim();
const announcementStatus=value=>['draft','published','archived'].includes(value)?value:'draft';
function sanitizeAnnouncement(item){
  return {
    id:cleanText(item?.id),
    title:cleanText(item?.title),
    body:cleanText(item?.body),
    date:cleanText(item?.date),
    status:announcementStatus(item?.status),
    classId:item?.classId||CLASS_ID,
    targetType:['class','student','students'].includes(item?.targetType)?item.targetType:'class',
    studentId:cleanText(item?.studentId)||undefined,
    studentIds:Array.isArray(item?.studentIds)?item.studentIds.map(cleanText).filter(Boolean):undefined,
    updatedAt:item?.updatedAt||item?.createdAt||''
  };
}
function announcementVisibleToStudent(item,studentId){
  if(item.status!=='published'||item.classId!==CLASS_ID)return false;
  if(item.targetType==='class')return true;
  if(item.targetType==='student')return item.studentId===studentId;
  if(item.targetType==='students')return Array.isArray(item.studentIds)&&item.studentIds.includes(studentId);
  return false;
}
async function saveAnnouncement(body){
  const id=cleanText(body.id),title=cleanText(body.title);
  if(!id)throw new Error('ANNOUNCEMENT_ID_REQUIRED');
  if(!title)throw new Error('TITLE_REQUIRED');
  const targetType=['class','student','students'].includes(body.targetType)?body.targetType:'class';
  const record={
    id,title,body:cleanText(body.body).slice(0,2000),date:cleanText(body.date)||now().slice(0,10),
    status:announcementStatus(body.status),classId:CLASS_ID,targetType,updatedAt:now()
  };
  if(targetType==='student'){
    const targetStudentId=cleanText(body.studentId);if(!getStudent(targetStudentId))throw new Error('STUDENT_NOT_FOUND');
    record.studentId=targetStudentId;
  }else if(targetType==='students'){
    const studentIds=[...new Set((Array.isArray(body.studentIds)?body.studentIds:[]).map(cleanText).filter(id=>getStudent(id)))];
    if(!studentIds.length)throw new Error('STUDENTS_REQUIRED');
    record.studentIds=studentIds;
  }
  const db=adminDb(),ref=db.doc(`${base()}/announcements/${id}`),existing=await ref.get();
  await ref.set({...record,...(!existing.exists?{createdAt:now()}:{})},{merge:true});
  return {saved:true,announcement:sanitizeAnnouncement({...record,createdAt:existing.exists?existing.data()?.createdAt:now()})};
}

async function studentSnapshot(studentId){
  const db=adminDb(),student=getStudent(studentId);
  if(!student)throw new Error('STUDENT_NOT_FOUND');
  const root=base();
  const ledgerRef=db.doc(`${root}/rewardLedgers/${studentId}_${monthKey()}`);
  const [ledger,profile,assessments,remediation,portfolio,evidence,communications,curriculum,weeklyPlan,announcements]=await Promise.all([
    ledgerRef.get(),
    db.doc(`${root}/studentProfiles/${studentId}`).get(),
    db.collection(`${root}/assessments`).where('studentId','==',studentId).get(),
    db.collection(`${root}/remediationPlans`).where('studentId','==',studentId).get(),
    db.collection(`${root}/portfolioEvents`).where('studentId','==',studentId).get(),
    db.collection(`${root}/homeworkEvidence`).where('studentId','==',studentId).get(),
    db.collection(`${root}/communications`).where('studentId','==',studentId).get(),
    db.collection(`${root}/curriculumTargets`).get(),
    db.collection(`${root}/weeklyPlans`).where('publishStatus','==','published').get(),
    db.collection(`${root}/announcements`).get()
  ]);
  const assessmentRows=items(assessments).sort(desc);
  const needsFollowupCount=assessmentRows.reduce((total,row)=>total+(row.behavior||[]).filter(item=>item?.code==='needs_followup').length,0);
  const evidenceRows=items(evidence).sort(desc);
  const homeworkIds=[...new Set(evidenceRows.map(x=>x.homeworkId).filter(Boolean))];
  const homeworkDocs=homeworkIds.length?await Promise.all(homeworkIds.map(id=>db.doc(`${root}/homework/${id}`).get())):[];
  const homework=homeworkDocs.filter(x=>x.exists).map(x=>{const raw={id:x.id,...x.data()};const safe=publicAutoGradingConfig(raw.autoGrading);return {...raw,autoGrading:safe||undefined}}).sort(desc);
  const curriculumRows=items(curriculum);
  const weeklyPlanAll=items(weeklyPlan).filter(x=>x.publishStatus==='published').sort((a,b)=>String(b.weekKey||'').localeCompare(String(a.weekKey||'')));
  const latestWeekKey=weeklyPlanAll[0]?.weekKey;
  const weeklyPlanRows=latestWeekKey?weeklyPlanAll.filter(x=>x.weekKey===latestWeekKey):[];
  const announcementRows=items(announcements).map(sanitizeAnnouncement).filter(item=>announcementVisibleToStudent(item,studentId)).sort((a,b)=>String(b.updatedAt||b.date).localeCompare(String(a.updatedAt||a.date))).slice(0,30);
  return {
    ok:true,student,profile:profile.exists?sanitizeProfile(profile.data()):null,month:monthKey(),stars:ledger.exists?clampStars(ledger.data()?.stars):0,
    needsFollowupCount,
    assessments:assessmentRows.slice(0,30),
    remediation:items(remediation).sort(desc).slice(0,20),
    portfolio:items(portfolio).sort(desc).slice(0,30),
    homework,homeworkEvidence:evidenceRows.slice(0,30),
    communications:items(communications).sort(desc).slice(0,30),
    announcements:announcementRows,
    curriculum:curriculumRows,
    weeklyPlan:weeklyPlanRows
  };
}

async function shareGuardianAccess(studentId,body){
  const requested=String(body.inviteToken||'').trim();
  if(!validAccessToken(requested))throw new Error('ACCESS_TOKEN_INVALID');
  const db=adminDb(),ref=db.doc(`${base()}/studentProfiles/${studentId}`),timestamp=now();
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),profile=snap.exists?snap.data():{};
    const current=String(profile?.guardianInviteToken||'');
    if(current&&current!==requested)throw new Error('ACCESS_SHARE_FORBIDDEN');
    const devices=normalizeGuardianDevices(profile);
    if(!current)tx.set(ref,{studentId,guardianInviteToken:requested,guardianDevices:devices,guardianAccessUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
    return {inviteToken:current||requested,devicesCount:devices.length,maxDevices:MAX_GUARDIAN_DEVICES};
  });
}

async function claimGuardianDevice(studentId,body){
  const invite=String(body.inviteToken||'').trim(),deviceToken=String(body.deviceToken||'').trim();
  if(!validAccessToken(invite))throw new Error('ACCESS_INVITE_INVALID');
  if(!validAccessToken(deviceToken))throw new Error('ACCESS_DEVICE_INVALID');
  const db=adminDb(),ref=db.doc(`${base()}/studentProfiles/${studentId}`),deviceHash=hashToken(deviceToken),timestamp=now();
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),profile=snap.exists?snap.data():{};
    if(String(profile?.guardianInviteToken||'')!==invite)throw new Error('ACCESS_INVITE_INVALID');
    const devices=normalizeGuardianDevices(profile),existing=devices.find(x=>x.tokenHash===deviceHash);
    if(existing){
      const next=devices.map(x=>x.tokenHash===deviceHash?{...x,lastSeenAt:timestamp}:x);
      tx.set(ref,{guardianDevices:next,guardianAccessUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
      return {linked:true,devicesCount:next.length,maxDevices:MAX_GUARDIAN_DEVICES};
    }
    if(devices.length>=MAX_GUARDIAN_DEVICES)throw new Error('ACCESS_DEVICE_LIMIT');
    const deviceLabel=String(body.deviceLabel||'جهاز ولي الأمر').trim().slice(0,80)||'جهاز ولي الأمر';
    const next=[...devices,{tokenHash:deviceHash,label:deviceLabel,linkedAt:timestamp,lastSeenAt:timestamp}];
    tx.set(ref,{studentId,guardianDevices:next,guardianAccessUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
    return {linked:true,devicesCount:next.length,maxDevices:MAX_GUARDIAN_DEVICES};
  });
}

async function verifyGuardianDevice(studentId,body){
  const deviceToken=String(body.deviceToken||'').trim();
  if(!validAccessToken(deviceToken))throw new Error('ACCESS_DEVICE_INVALID');
  const snap=await adminDb().doc(`${base()}/studentProfiles/${studentId}`).get();
  const devices=normalizeGuardianDevices(snap.exists?snap.data():{}),deviceHash=hashToken(deviceToken);
  if(!devices.some(x=>x.tokenHash===deviceHash))throw new Error('ACCESS_DEVICE_NOT_LINKED');
  return {verified:true,devicesCount:devices.length,maxDevices:MAX_GUARDIAN_DEVICES};
}

async function releaseGuardianDevice(studentId,body){
  const deviceToken=String(body.deviceToken||'').trim();
  if(!validAccessToken(deviceToken))throw new Error('ACCESS_DEVICE_INVALID');
  const db=adminDb(),ref=db.doc(`${base()}/studentProfiles/${studentId}`),deviceHash=hashToken(deviceToken),timestamp=now();
  return db.runTransaction(async tx=>{
    const snap=await tx.get(ref),profile=snap.exists?snap.data():{};
    const devices=normalizeGuardianDevices(profile),next=devices.filter(x=>x.tokenHash!==deviceHash);
    if(next.length!==devices.length)tx.set(ref,{guardianDevices:next,guardianAccessUpdatedAt:timestamp,updatedAt:timestamp},{merge:true});
    return {released:next.length!==devices.length,devicesCount:next.length,maxDevices:MAX_GUARDIAN_DEVICES};
  });
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
  const instructions=String(body.instructions||'').trim().slice(0,2000);
  const kind=body.kind==='training'?'training':'homework';
  const answerKey=String(body.answerKey||'').trim().slice(0,500);
  const alternatives=acceptedHomeworkAnswers(body.acceptedAnswers).slice(0,12).map(x=>String(x).slice(0,500));
  const maxScore=Math.min(100,Math.max(1,Number(body.maxScore)||10));
  const autoGrading=answerKey?createAutoGradingConfig({answerKey,acceptedAnswers:alternatives,maxScore},gradingSecretFromEnv()):null;
  const db=adminDb(),root=base(),id=uid(kind),evidenceId=`${id}_${studentId}`,timestamp=now();
  const record={id,classId:CLASS_ID,subject:kind==='training'?'تدريب منزلي':'واجب',title,instructions,targetIds:[],assignedAt:timestamp,status:'published',kind,...(autoGrading?{autoGrading}:{})};
  const batch=db.batch();
  batch.set(db.doc(`${root}/homework/${id}`),record);
  batch.set(db.doc(`${root}/homeworkEvidence/${evidenceId}`),{id:evidenceId,homeworkId:id,studentId,status:'assigned',assignedAt:timestamp,maxScore:autoGrading?.maxScore||maxScore,autoGradingEnabled:Boolean(autoGrading)});
  await batch.commit();
  return {saved:true,id,autoGradingEnabled:Boolean(autoGrading),maxScore:autoGrading?.maxScore||maxScore};
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

async function autoGradeSmoke(){
  const studentId='s2-4-02',student=getStudent(studentId);if(!student)throw new Error('STUDENT_NOT_FOUND');
  const db=adminDb(),root=base(),id=uid('__autograde_smoke__'),evidenceId=`${id}_${studentId}`,homeworkRef=db.doc(`${root}/homework/${id}`),evidenceRef=db.doc(`${root}/homeworkEvidence/${evidenceId}`),timestamp=now();
  const secret=gradingSecretFromEnv(),autoGrading=createAutoGradingConfig({answerKey:'المدينة المنورة',acceptedAnswers:['الْمَدِينَةُ الْمُنَوَّرَةُ'],maxScore:10},secret);
  const batch=db.batch();
  batch.set(homeworkRef,{id,classId:CLASS_ID,subject:'واجب',title:'اختبار آلي مؤقت',instructions:'اختبار داخلي للتصحيح الآلي',targetIds:[],assignedAt:timestamp,status:'published',kind:'homework',autoGrading});
  batch.set(evidenceRef,{id:evidenceId,homeworkId:id,studentId,status:'assigned',assignedAt:timestamp,maxScore:10,autoGradingEnabled:true});
  await batch.commit();
  const grade=gradeHomeworkAnswer({answer:'الْمَدِينَةُ الْمُنَوَّرَةُ',config:autoGrading,secret});
  await evidenceRef.set({status:grade.status,submittedAt:timestamp,score:grade.score,maxScore:grade.maxScore,correct:grade.correct,autoFeedback:grade.feedback,gradingMode:grade.mode,requiresTeacherReview:grade.requiresTeacherReview},{merge:true});
  const [homeworkSnap,evidenceSnap]=await Promise.all([homeworkRef.get(),evidenceRef.get()]);
  const publicConfig=publicAutoGradingConfig(homeworkSnap.data()?.autoGrading);
  const verified=Boolean(homeworkSnap.exists&&evidenceSnap.exists&&evidenceSnap.data()?.correct===true&&evidenceSnap.data()?.score===10&&publicConfig?.enabled&&!('answerDigests' in publicConfig));
  await Promise.all([homeworkRef.delete(),evidenceRef.delete()]);
  const [homeworkAfter,evidenceAfter]=await Promise.all([homeworkRef.get(),evidenceRef.get()]);
  return {autoGradeSmoke:true,studentId,studentName:student.name,verified,score:grade.score,maxScore:grade.maxScore,feedback:grade.feedback,answerKeyHidden:!('answerDigests' in (publicConfig||{})),cleaned:!homeworkAfter.exists&&!evidenceAfter.exists};
}

async function stagingSmoke(){
  previewWriteGuard();
  const db=adminDb(),root=base(),id=uid('__staging_smoke__'),ref=db.doc(`${root}/communications/${id}`),value={id,studentId:'__staging_test__',recipient:'guardian',reasonCode:'smoke',summary:'staging smoke',createdAt:now(),status:'recorded'};
  await ref.set(value);const snap=await ref.get();const readable=snap.exists&&snap.data()?.summary==='staging smoke';await ref.delete();const deleted=!(await ref.get()).exists;
  const autoGrade=await autoGradeSmoke();
  return {ok:true,firebaseAdmin:true,write:true,read:readable,delete:deleted,autoGrade,productionProtected:process.env.VERCEL_ENV!=='production'};
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'&&String(req.query?.action||'')==='smoke')return res.status(200).json(await stagingSmoke());
    const body=req.method==='GET'?{}:jsonBody(req);
    if(req.method==='POST'&&String(body.action||'')==='announcement'){
      previewWriteGuard();return res.status(200).json({ok:true,...await saveAnnouncement(body)});
    }
    const studentId=String((req.method==='GET'?req.query?.studentId:body.studentId)||'');
    const student=getStudent(studentId);if(!student)return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    if(req.method==='GET'){
      if(String(req.query?.guardianAccess||'')==='1')await verifyGuardianDevice(studentId,{deviceToken:String(req.query?.deviceToken||'')});
      return res.status(200).json(await studentSnapshot(studentId));
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const action=String(body.action||'');let result;
    if(action==='access_share')result=await shareGuardianAccess(studentId,body);
    else if(action==='access_claim')result=await claimGuardianDevice(studentId,body);
    else if(action==='access_verify')result=await verifyGuardianDevice(studentId,body);
    else if(action==='access_release')result=await releaseGuardianDevice(studentId,body);
    else if(action==='star')result=await addStar(studentId);
    else if(action==='assessment')result=await saveAssessment(studentId,body);
    else if(action==='behavior')result=await saveBehavior(studentId,body);
    else if(action==='quick_assessment')result=await saveQuickAssessment(studentId,body);
    else if(action==='assessment_group')result=await saveAssessmentGroup(studentId,body);
    else if(['followup','student_note','guardian_message','remediation'].includes(action))result=await saveCommunication(studentId,{...body,kind:action});
    else if(action==='homework'||action==='training')result=await saveHomework(studentId,{...body,kind:action});
    else if(action==='student_profile')result=await saveStudentProfile(studentId,body);
    else return res.status(400).json({ok:false,error:'ACTION_NOT_SUPPORTED'});
    if(action.startsWith('access_'))return res.status(200).json({ok:true,...result});
    return res.status(200).json({ok:true,...result,state:await studentSnapshot(studentId)});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:message==='ACCESS_DEVICE_LIMIT'?409:['ACCESS_INVITE_INVALID','ACCESS_DEVICE_INVALID','ACCESS_DEVICE_NOT_LINKED','ACCESS_SHARE_FORBIDDEN'].includes(message)?403:message.endsWith('_REQUIRED')||message.endsWith('_EMPTY')||message.endsWith('_INVALID')?400:500;
    console.error('student-state',message);
    return res.status(status).json({ok:false,error:message});
  }
}
