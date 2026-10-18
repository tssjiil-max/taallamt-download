import {photoFeedback} from './photo-feedback.js';
import {processVisualPhoto,visualRevision,validateRegions} from './visual-photo.js';
import {publishedQuran,QURAN_SOURCE} from './quran-reader.js';
import {evaluateVerifiedPhotoAnswers} from './photo-review-score.js';
import {CONTENT_TEMPLATES} from './teacher-content-bank.js';
import {studentProfilePatch} from './student-profile-patch.js';
import {isFocused} from './quick-assess.js';
import {TEACHER_BOOK_REFERENCE} from './teacher-book-reference.js';
import {DEMO_STUDENT_ID,DEMO_STUDENT,DEMO_TARGET,DEMO_TARGETS,DEMO_PLAN,DEMO_ANNOUNCEMENTS,demoHome} from './learning-pilot-demo.js';
import {randomUUID,createHash} from 'node:crypto';
import {adminDb} from './firebase-admin.js';
import {CLASS_ID} from './class-roster.js';
import {requireStudentAccess,AccessError} from './access.js';
import {rosterStudent,ROSTER} from './roster.js';
import {workspaceRoot,readWeekPlan} from './plan.js';
import {weekNumberForDate} from './learning-content.js';
import {buildLearningModel,validateContent,selectActivity,publicActivity,gradeAnswer,recordAttempt,learningWeek} from './learning-core.js';
import {visibleAnnouncements,isVisibleAnnouncement} from './announcement-policy.js';

export const PILOT_BRANCH='preview/shakabumbo-pilot-20261013';
export function requirePilot(environment=process.env){
  if(environment.VERCEL_ENV==='production'||(environment.VERCEL_ENV&&environment.VERCEL_GIT_COMMIT_REF!==PILOT_BRANCH))throw new AccessError('PILOT_NOT_AVAILABLE',404);
}
const rows=snap=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const safeId=value=>{const s=String(value||'');if(!/^[A-Za-z0-9:_-]{1,100}$/.test(s))throw new AccessError('ID_INVALID',400);return s};
const memoryOf=profile=>profile?.learningPilotMemory||{};
const isUnverifiedReading=target=>target?.subject==='arabic'&&(
  String(target.id||'').includes('original-arabic-')||
  String(target.learning?.reference||'').includes('نص وتدريب أصليان لفهم المقروء')
);
const safeCurriculum=targets=>targets.filter(target=>!isUnverifiedReading(target));

const now=()=>new Date().toISOString();
const scopedProfileId=(id,session)=>id===DEMO_STUDENT_ID&&session?`${id}_${safeId(session).slice(0,64)}`:id;
const pilotProfile=(id,session)=>adminDb().doc(`${workspaceRoot()}/studentProfiles/${scopedProfileId(id,session)}`);
async function authorizeStudent(req,studentId,body,write=false){if(studentId===DEMO_STUDENT_ID)return 'guardian';return requireStudentAccess(req,studentId,body,{write})}
const onlyStudent=(plan,studentId)=>plan.studentId===studentId;

async function readContext(studentId,demoSession=''){
  const student=studentId===DEMO_STUDENT_ID?DEMO_STUDENT:rosterStudent(studentId);if(!student)throw new AccessError('STUDENT_NOT_FOUND',404);
  const db=adminDb(),base=workspaceRoot();
  if(studentId===DEMO_STUDENT_ID){const profile=await pilotProfile(studentId,demoSession).get(),memory=memoryOf(profile.data());return {student:DEMO_STUDENT,memory,catalog:safeCurriculum(DEMO_TARGETS),model:buildLearningModel({studentId,targets:safeCurriculum(DEMO_TARGETS),memory,now:now()}),assessments:[],plans:[DEMO_PLAN]}}
  const [profile,targets,assessments,plans]=await Promise.all([db.doc(`${base}/studentProfiles/${studentId}`).get(),db.collection(`${base}/curriculumTargets`).get(),db.collection(`${base}/assessments`).where('studentId','==',studentId).get(),db.collection(`${base}/remediationPlans`).where('studentId','==',studentId).get()]);
  const memory=memoryOf(profile.exists?profile.data():{}),catalog=safeCurriculum(rows(targets)),timestamp=now();
  const model=buildLearningModel({studentId,targets:catalog,assessments:rows(assessments),memory,now:timestamp,weekNumber:weekNumberForDate()});
  const planRows=rows(plans).filter(p=>p.source==='learning-pilot'&&onlyStudent(p,studentId));
  const fileIds=[...new Set(planRows.flatMap(p=>p.fileIds||[]))].slice(0,40),fileSnaps=await Promise.all(fileIds.map(id=>db.doc(`${base}/files/${safeId(id)}`).get()));
  const fileMap=new Map(fileSnaps.filter(f=>f.exists&&canSeeFile(f.data(),studentId)).map(f=>[f.id,{id:f.id,title:f.data().title,name:f.data().name}]));
  return {student,memory,catalog,model,assessments:rows(assessments),plans:planRows.map(p=>({...p,files:(p.fileIds||[]).map(id=>fileMap.get(id)).filter(Boolean)}))};
}
const canSeeFile=(file,studentId)=>file.visibility==='public'||(file.visibility==='private'&&file.targetStudentIds?.includes(studentId));
function safeLink(raw){try{const url=new URL(String(raw));if(url.protocol!=='https:'||url.username||url.password)throw new Error();return url.href}catch{throw new AccessError('LINK_INVALID',400)}}
function publicPlan(plan){return {id:plan.id,title:'خطتي للتقدم',goal:String(plan.goal||''),instructions:String(plan.instructions||''),status:plan.status,targetId:plan.targetId,dueDate:plan.dueDate||'',activities:plan.activities||[],files:plan.files||[],links:plan.links||[]}}
function activityView(context,targetId,mode){
  const id=targetId||context.model.next?.targetId,target=context.catalog.find(t=>t.id===id),skill=context.model.skills.find(s=>s.targetId===id);
  if(!target||!skill)return null;
  // The target must be currently reachable; mastery does not permit bypassing prerequisites.
  const prerequisites=target.learning.prerequisites||[];
  if(prerequisites.some(id=>!context.model.skills.some(s=>s.targetId===id&&['mastered','practice_mastered'].includes(s.state))))return null;
  const activity=selectActivity(target,context.memory);
  const strategy=context.model.next?.targetId===id?context.model.next.strategy||target.learning.strategy:target.learning.strategy;
  return {targetId:id,title:target.skill||target.title,subject:target.subject,explanation:target.learning.alternatives?.[strategy]||target.learning.explanation,reference:target.learning.reference,strategy,mode:mode||context.model.next?.mode||'practice',question:publicActivity(activity),teacherReview:target.subject==='handwriting'};
}
export async function studentPilotRead(req,res){
  requirePilot();if(String(req.query?.pilot)!=='1')throw new AccessError('PILOT_NOT_AVAILABLE',404);
  const studentId=String(req.query.studentId||'');const role=await authorizeStudent(req,studentId,null);
  if(req.query.view==='home'&&studentId===DEMO_STUDENT_ID){const p=await pilotProfile(studentId,req.query.demoSession).get(),home=demoHome();home.student={...home.student,photo:p.data()?.photoDataUrl||'',hobbies:p.data()?.hobbies||[]};return res.status(200).json(home);}
  if(req.query.view==='learning-portfolio'){
    const context=await readContext(studentId,req.query.demoSession);
    const db=adminDb(),base=workspaceRoot();
    const demo=studentId===DEMO_STUDENT_ID;
    const [photoSnap,eventSnap]=await Promise.all([
      db.collection(`${base}/homeworkEvidence`).where('studentId','==',studentId).get(),
      demo?Promise.resolve(null):db.collection(`${base}/portfolioEvents`).where('studentId','==',studentId).get()
    ]);
    const prefix=scopedProfileId(studentId,req.query.demoSession)+'_';
    const ownedPhotos=rows(photoSnap).filter(p=>p.photoSource==='learning-pilot-photo'&&(studentId!==DEMO_STUDENT_ID||(p.id.startsWith(prefix)||p.demoProfileId===scopedProfileId(studentId,req.query.demoSession))))
      .sort((a,b)=>String(b.photoSubmittedAt||b.submittedAt||'').localeCompare(String(a.photoSubmittedAt||a.submittedAt||''))).slice(0,40);
    const homeworkIds=[...new Set(ownedPhotos.map(p=>p.homeworkId).filter(id=>typeof id==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(id)))];
    const homeworkDocs=demo?[]:await Promise.all(homeworkIds.map(id=>db.doc(`${base}/homework/${id}`).get()));
    const homeworkTitles=new Map(homeworkDocs.filter(doc=>doc.exists).map(doc=>[doc.id,String(doc.data().title||doc.data().subject||'واجب')]));
    const submissions=ownedPhotos
      .map(p=>({id:p.id,image:/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(p.photoImage||''))?p.photoImage:null,title:homeworkTitles.get(p.homeworkId)||'واجب مصور',homeworkId:p.homeworkId,submittedAt:p.photoSubmittedAt||p.submittedAt||'',status:p.photoStatus||'submitted',photoQuality:p.photoQuality||null,feedback:p.photoFeedback||p.photoAssessment?.feedback||null,visualReport:p.visualReport?{status:p.visualReport.status,readings:p.visualReport.readings.map(r=>({questionId:r.questionId,text:r.text,confidence:r.confidence,status:r.status,reason:r.reason})),reasons:p.visualReport.reasons}:null,assessment:p.photoAssessment||null,reviewNote:String(p.photoReviewNote||'').slice(0,600)}));
    const achievements=(eventSnap?rows(eventSnap):[]).filter(p=>p.type==='achievement'||p.type==='positive_behavior'||p.type==='improvement')
      .sort((a,b)=>String(b.occurredAt||'').localeCompare(String(a.occurredAt||''))).slice(0,40)
      .map(p=>({id:p.id,title:String(p.summary||'إنجاز موثق').slice(0,220),date:p.occurredAt||''}));
    const assessments=context.assessments.map(p=>({id:p.id,date:p.enteredAt||p.createdAt||p.updatedAt||'',academic:(Array.isArray(p.academic)?p.academic:[]).map(a=>({title:String(a.title||a.skillName||a.skill||a.code||'مهارة'),result:a.result||''}))})).slice(0,30);
    const plans=context.plans.map(p=>({id:p.id,title:String(p.goal||'خطة للتقدم'),status:p.status||'',date:p.dueDate||''}));
    return res.status(200).json({ok:true,student:{id:context.student.id,name:context.student.name||context.student.fullName||context.student.firstName||''},skills:context.model.skills,stars:context.memory.learningStars||[],trainingRecords:(context.memory.attempts||[]).slice(-40).map(a=>({id:a.id,title:context.catalog.find(t=>t.id===a.targetId)?.title||'تدريب',correct:a.correct,date:a.at})),assessments,achievements,plans,submissions});
  }
  if(req.query.view==='homework-photo'){const id=safeId(req.query.homeworkId),ref=adminDb().doc(`${workspaceRoot()}/homeworkEvidence/${studentId===DEMO_STUDENT_ID?scopedProfileId(studentId,req.query.demoSession)+'_'+id:id+'_'+studentId}`),snap=await ref.get();return res.status(200).json({ok:true,submission:snap.exists?{image:snap.data().photoImage,status:snap.data().photoStatus,submittedAt:snap.data().photoSubmittedAt,feedback:snap.data().photoFeedback||snap.data().photoAssessment?.feedback||null,photoQuality:snap.data().photoQuality||null}:null});}
  if(req.query.view==='learning-quran'){
    const p=await pilotProfile(studentId,req.query.demoSession).get(),plan=studentId===DEMO_STUDENT_ID?demoHome().plan:await readWeekPlan(adminDb(),weekNumberForDate());
    return res.status(200).json({ok:true,source:QURAN_SOURCE,segments:publishedQuran(plan),reviews:memoryOf(p.data()).quranReviews||[]});
  }
  if(req.query.view==='announcement-pilot'){
    if(studentId===DEMO_STUDENT_ID){const profile=await pilotProfile(studentId,req.query.demoSession).get();return res.status(200).json({ok:true,...visibleAnnouncements(DEMO_ANNOUNCEMENTS,CLASS_ID,profile.data()?.announcementReads||{})})}
    const db=adminDb(),base=workspaceRoot();const [items,profile]=await Promise.all([db.collection(`${base}/announcements`).get(),db.doc(`${base}/studentProfiles/${studentId}`).get()]);
    return res.status(200).json({ok:true,...visibleAnnouncements(rows(items),CLASS_ID,profile.data()?.announcementReads||{})});
  }
  const context=await readContext(studentId,req.query.demoSession);
  if(req.query.view==='learning-print'){
    const targetId=safeId(req.query.targetId),target=context.catalog.find(t=>t.id===targetId);
    if(!activityView(context,targetId))throw new AccessError('CONTENT_NOT_AVAILABLE',404);
    const teacher=req.query.copy==='teacher';if(teacher&&role!=='teacher')throw new AccessError('TEACHER_AUTH_REQUIRED',403);
    // A generated paper is tracked separately from completed/graded training in the existing evidence store.
    const id=req.query.paperId?safeId(req.query.paperId):`pilot-paper-${randomUUID()}`,paperRef=adminDb().doc(`${workspaceRoot()}/homeworkEvidence/${id}`);
    let paper;
    if(req.query.paperId){const stored=await paperRef.get();paper=stored.data();if(!stored.exists||paper.kind!=='learning-pilot-paper'||paper.studentId!==studentId||paper.targetId!==targetId||(studentId===DEMO_STUDENT_ID&&paper.demoSession!==String(req.query.demoSession||'')))throw new AccessError('PAPER_ACCESS_DENIED',403)}
    else{
      const variant=Math.abs(Number.parseInt(String(req.query.variant||'0'),10)||0),questions=target.learning.questions;
      const selected=Array.from({length:Math.min(4,questions.length)},(_,i)=>questions[(variant+i)%questions.length]);
      paper={id,studentId,targetId,demoSession:studentId===DEMO_STUDENT_ID?String(req.query.demoSession||''):'',kind:'learning-pilot-paper',status:'printed',questions:selected.map(publicActivity),sourceRevision:target.learning.approvedAt||target.learning.reference,createdAt:now()};
      const profile=pilotProfile(studentId,req.query.demoSession);
      await adminDb().runTransaction(async tx=>{const snap=await tx.get(profile),day=now().slice(0,10),previous=snap.data()?.learningPilotPrints||{},count=previous.day===day?Number(previous.count)||0:0;if(count>=10)throw new AccessError('DAILY_LIMIT_REACHED',429);tx.set(profile,{learningPilotPrints:{day,count:count+1}},{merge:true});tx.set(paperRef,paper)});
    }
    if(paper.sourceRevision!==(target.learning.approvedAt||target.learning.reference))throw new AccessError('CONTENT_CHANGED',409);
    const selected=paper.questions.map(q=>target.learning.questions.find(current=>current.id===q.id)).filter(Boolean);
    res.setHeader('Content-Type','text/html; charset=utf-8');
    return res.status(200).send(worksheetHtml({student:context.student,target:{...target,learning:{...target.learning,questions:selected}},teacher,id,timestamp:paper.createdAt}));
  }
  return res.status(200).json({ok:true,student:{id:context.student.id,firstName:context.student.firstName},model:context.model,activity:activityView(context,req.query.targetId),plans:context.plans.filter(p=>['active','improved','needs_more_support','resolved'].includes(p.status)).map(publicPlan)});
}
export async function studentPilotWrite(req,res,body){
  requirePilot();if(body.pilot!==true)throw new AccessError('PILOT_NOT_AVAILABLE',404);
  const studentId=String(body.studentId||'');await authorizeStudent(req,studentId,body,true);
  if(studentId!==DEMO_STUDENT_ID&&!rosterStudent(studentId))throw new AccessError('STUDENT_NOT_FOUND',404);
  const db=adminDb(),base=workspaceRoot(),profile=pilotProfile(studentId,body.demoSession);
  if(body.action==='learning_activity_photo'){
    const targetId=safeId(body.targetId),questionId=safeId(body.questionId);
    const context=await readContext(studentId,body.demoSession);
    const activity=activityView(context,targetId);
    if(!activity||activity.question?.id!==questionId)throw new AccessError('ACTIVITY_CHANGED',409);
    if(isUnverifiedReading(context.catalog.find(t=>t.id===targetId)))throw new AccessError('CONTENT_NOT_AVAILABLE',404);
    const baseId=studentId===DEMO_STUDENT_ID?scopedProfileId(studentId,body.demoSession):studentId;
    const id='activity-'+createHash('sha256').update([baseId,targetId,questionId].join(':')).digest('hex').slice(0,40);
    const ref=db.doc(`${base}/homeworkEvidence/${id}`),existing=await ref.get();
    if(existing.exists&&existing.data()?.studentId!==studentId)throw new AccessError('PHOTO_ACCESS_DENIED',403);
    if(existing.exists&&existing.data()?.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);
    const image=String(body.image||'');
    if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>280000)throw new AccessError('PHOTO_INVALID',400);
    const {default:sharp}=await import('sharp');
    const buffer=Buffer.from(image.split(',')[1],'base64');
    let quality;
    try{
      const reader=sharp(buffer,{limitInputPixels:4000000}),meta=await reader.metadata();
      if(meta.format!=='jpeg'||!meta.width||!meta.height)throw new Error('bad image');
      const stats=await reader.stats(),warnings=[];
      if(Math.min(meta.width,meta.height)<650)warnings.push('الصورة منخفضة الدقة؛ اقترب من الورقة.');
      if(stats.channels.slice(0,3).every(c=>c.mean<75))warnings.push('الصورة داكنة؛ زِد الإضاءة.');
      if(stats.channels.slice(0,3).every(c=>c.mean>238))warnings.push('خفّف انعكاس الإضاءة على الورقة.');
      quality={status:warnings.length?'needs_clearer_photo':'captured',warnings,width:meta.width,height:meta.height};
    }catch{throw new AccessError('PHOTO_INVALID',400)}
    const target=context.catalog.find(t=>t.id===targetId);
    const visualReport=await processVisualPhoto(image);
    const feedback=photoFeedback({firstName:(studentId===DEMO_STUDENT_ID?DEMO_STUDENT:rosterStudent(studentId))?.firstName,quality:quality});
    await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);tx.set(ref,{id,studentId,demoProfileId:studentId===DEMO_STUDENT_ID?baseId:null,homeworkId:'learning-activity',targetId,questionId,activityPrompt:activity.question.prompt,visualReport,photoFeedback:feedback,photoSourceRevision:visualRevision(target),
      photoSource:'learning-pilot-photo',photoImage:image,photoQuality:quality,photoStatus:'pending_teacher_review',
      photoSubmittedAt:now(),photoRequiresTeacherReview:true,photoAssessment:null,photoReviewNote:''},{merge:true})});
    return res.status(200).json({ok:true,status:'pending_teacher_review',photoQuality:quality,academicScore:null,starGranted:false,visualStatus:visualReport.status,feedback});
  }
  if(body.action==='homework_photo'){
    const homeworkId=safeId(body.homeworkId),demo=studentId===DEMO_STUDENT_ID;
    const ref=db.doc(`${base}/homeworkEvidence/${demo?scopedProfileId(studentId,body.demoSession)+'_'+homeworkId:homeworkId+'_'+studentId}`);
    if(demo){if(homeworkId!=='pilot-hw')throw new AccessError('HOMEWORK_NOT_ASSIGNED',403)}
    else{const assigned=await db.doc(`${base}/homeworkEvidence/${homeworkId}_${studentId}`).get();if(!assigned.exists)throw new AccessError('HOMEWORK_NOT_ASSIGNED',403)}
    const previous=await ref.get();if(previous.data()?.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);
    const image=String(body.image||'');if(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>280000)throw new AccessError('PHOTO_INVALID',400);
    const {default:sharp}=await import('sharp');const buffer=Buffer.from(image.split(',')[1],'base64');
    let photoQuality;
    try{const imageReader=sharp(buffer,{limitInputPixels:4000000});const metadata=await imageReader.metadata();if(metadata.format!=='jpeg'||!metadata.width||!metadata.height)throw new Error('invalid');const stats=await imageReader.stats();const pixels=metadata.width*metadata.height;const warnings=[];if(Math.min(metadata.width,metadata.height)<650)warnings.push('دقة الصورة منخفضة؛ قرّب التصوير وثبّت الجوال.');if(stats.channels.slice(0,3).every(c=>c.mean<75))warnings.push('الصورة داكنة؛ استخدم إضاءة أقوى.');if(stats.channels.slice(0,3).every(c=>c.mean>238))warnings.push('الصورة شديدة الإضاءة؛ تجنب انعكاس الضوء.');photoQuality={status:warnings.length?'needs_clearer_photo':'captured',warnings,width:metadata.width,height:metadata.height,pixels,academicScore:null,academicReview:'بانتظار التحقق من الإجابات'};}catch{throw new AccessError('PHOTO_INVALID',400)}
    const visualReport=await processVisualPhoto(image);
    const feedback=photoFeedback({firstName:(studentId===DEMO_STUDENT_ID?DEMO_STUDENT:rosterStudent(studentId))?.firstName,quality:photoQuality});
    await db.runTransaction(async tx=>{const current=await tx.get(ref);if(current.data()?.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);tx.set(ref,{photoQuality,visualReport,photoFeedback:feedback,photoAssessment:null,photoReviewNote:'',photoSource:'learning-pilot-photo',studentId,homeworkId,photoImage:image,photoStatus:'pending_teacher_review',photoSubmittedAt:now(),photoRequiresTeacherReview:true},{merge:true})});
    return res.status(200).json({ok:true,status:'pending_teacher_review',score:null,photoQuality,feedback});
  }
  if(body.action==='quran_review'){
    const plan=studentId===DEMO_STUDENT_ID?demoHome().plan:await readWeekPlan(db,weekNumberForDate());
    if(!publishedQuran(plan).some(s=>s.id===body.segmentId))throw new AccessError('QURAN_SCOPE_DENIED',403);
    await db.runTransaction(async tx=>{const p=await tx.get(profile),memory=memoryOf(p.data()),reviews=memory.quranReviews||[];tx.set(profile,{learningPilotMemory:{...memory,quranReviews:[...reviews.filter(r=>r.id!==body.segmentId),{id:body.segmentId,at:now(),kind:'self_reported_review'}].slice(-40)}},{merge:true})});
    return res.status(200).json({ok:true,reviewed:true,masteryChanged:false});
  }
  if(body.action==='student_profile'){
    if(studentId!==DEMO_STUDENT_ID||!body.demoSession)throw new AccessError('PILOT_NOT_AVAILABLE',404);
    await profile.set(studentProfilePatch(studentId,body,now()),{merge:true});
    return res.status(200).json({ok:true,saved:true});
  }
  if(body.action==='announcement_read'&&studentId===DEMO_STUDENT_ID){const id=safeId(body.id);if(!DEMO_ANNOUNCEMENTS.some(a=>a.id===id))throw new AccessError('ANNOUNCEMENT_NOT_FOUND',404);await profile.set({announcementReads:{[id]:now()}},{merge:true});return res.status(200).json({ok:true,read:true})}
  if(body.action==='announcement_read'){
    const id=safeId(body.id),ref=db.doc(`${base}/announcements/${id}`);
    await db.runTransaction(async tx=>{const [item,p]=await Promise.all([tx.get(ref),tx.get(profile)]);if(!item.exists||!isVisibleAnnouncement(item.data(),CLASS_ID))throw new AccessError('ANNOUNCEMENT_NOT_FOUND',404);const reads={...(p.data()?.announcementReads||{}),[id]:now()};if(Object.keys(reads).length>500){const ids=Object.keys(reads).sort((a,b)=>reads[b].localeCompare(reads[a]));for(const key of ids.slice(500))delete reads[key]}tx.set(profile,{announcementReads:reads},{merge:true})});
    return res.status(200).json({ok:true,read:true});
  }
  const context=await readContext(studentId,body.demoSession),targetId=safeId(body.targetId),attemptId=safeId(body.attemptId),target=context.catalog.find(t=>t.id===targetId);
  if(target?.subject==='handwriting')throw new AccessError('TEACHER_REVIEW_REQUIRED',400);
  if(!activityView(context,targetId))throw new AccessError('CONTENT_NOT_AVAILABLE',404);
  const attemptRef=db.doc(`${profile.path}/pilotAttempts/${attemptId}`);
  const result=await db.runTransaction(async tx=>{
    const [snap,journal]=await Promise.all([tx.get(profile),tx.get(attemptRef)]),memory=memoryOf(snap.data()),existing=journal.exists?journal.data():(memory.attempts||[]).find(a=>a.id===attemptId);
    if(existing){if(existing.targetId!==targetId)throw new AccessError('ATTEMPT_CONFLICT',409);return {duplicate:true,correct:existing.correct}}
    const count=(memory.attempts||[]).filter(a=>a.at.slice(0,10)===now().slice(0,10)).length;
    if(count>=target.learning.dailyLimit)throw new AccessError('DAILY_LIMIT_REACHED',429);
    let currentTarget=target;if(studentId!==DEMO_STUDENT_ID){const stored=await tx.get(db.doc(`${base}/curriculumTargets/${targetId}`));currentTarget=stored.exists?{id:stored.id,...stored.data()}:null;if(!currentTarget||currentTarget.learning?.status!=='approved')throw new AccessError('CONTENT_NOT_AVAILABLE',404)}
    const question=selectActivity(currentTarget,memory);
    if(question.id!==String(body.questionId||''))throw new AccessError('ACTIVITY_CHANGED',409);
    const correct=gradeAnswer(question,body.answer),timestamp=now();
    const next=recordAttempt(memory,{id:attemptId,targetId,questionId:question.id,correct,mode:body.mode,strategy:activityView({...context,memory},targetId)?.strategy||target.learning.strategy,errorType:question.errorType},timestamp);
    tx.set(profile,{learningPilotMemory:next},{merge:true});
    tx.set(attemptRef,{targetId,questionId:question.id,correct,at:timestamp});
    return {correct,star:(next.learningStars||[]).find(s=>s.id===attemptId)||null,hint:correct?'':question.hint||'راجع الشرح، ثم جرّب المثال التالي.',updatedAt:timestamp};
  });
  return res.status(200).json({ok:true,...result});
}
export async function teacherPilotRead(query){
  requirePilot();const db=adminDb(),base=workspaceRoot();
  const [targets,profiles,assessments,plans,papers,photos]=await Promise.all([db.collection(`${base}/curriculumTargets`).get(),db.collection(`${base}/studentProfiles`).get(),db.collection(`${base}/assessments`).get(),db.collection(`${base}/remediationPlans`).get(),db.collection(`${base}/homeworkEvidence`).where('kind','==','learning-pilot-paper').get(),db.collection(`${base}/homeworkEvidence`).where('photoSource','==','learning-pilot-photo').get()]);
  const catalog=safeCurriculum(rows(targets)),profilesRows=rows(profiles),assessmentRows=rows(assessments),planRows=rows(plans).filter(p=>p.source==='learning-pilot');
  const students=ROSTER.map(student=>{const profile=profilesRows.find(p=>p.id===student.id)||{};const model=buildLearningModel({studentId:student.id,targets:catalog,assessments:assessmentRows,memory:memoryOf(profile),now:now(),weekNumber:weekNumberForDate()});return {id:student.id,name:student.name,needsIntervention:isFocused(profile,'')||model.skills.some(s=>s.state==='needs_practice'),next:model.next,skills:model.skills}}).filter(Boolean);
  return {ok:true,photos:rows(photos).filter(p=>rosterStudent(p.studentId)).map(p=>({...p,image:p.photoImage,submittedAt:p.photoSubmittedAt,photoQuality:p.photoQuality||null})),contentTemplates:CONTENT_TEMPLATES,bookReference:TEACHER_BOOK_REFERENCE,students,targets:catalog,plans:planRows,papers:rows(papers).filter(p=>rosterStudent(p.studentId)),contentPending:catalog.filter(t=>t.learning?.status!=='approved').length};
}
export async function teacherPilotWrite(action,body){
  requirePilot();const db=adminDb(),base=workspaceRoot(),timestamp=now();
  if(action==='learning_approve_reading')throw new AccessError('SOURCE_VERIFICATION_REQUIRED',409);
  if(action==='learning_content'){
    const id=safeId(body.id),learning=validateContent(body.learning),subject=String(body.subject||'');
    if(!['arabic','spelling','handwriting'].includes(subject))throw new AccessError('SUBJECT_INVALID',400);
    if(subject==='arabic'&&learning.status==='approved'&&isUnverifiedReading({id,subject,learning}))throw new AccessError('SOURCE_VERIFICATION_REQUIRED',409);
    if(subject==='handwriting'&&learning.status==='approved'&&!learning.rulingVerified)throw new AccessError('RULING_VERIFICATION_REQUIRED',400);
    if(learning.prerequisites.includes(id))throw new AccessError('PREREQUISITE_INVALID',400);
    const title=String(body.title||'').trim().slice(0,200);if(!title)throw new AccessError('TITLE_REQUIRED',400);
    const ref=db.doc(`${base}/curriculumTargets/${id}`),previous=await ref.get();
    // Existing curriculum targets retain their subject, title, distribution and official assessment links.
    const record={learning:{...learning,approvedAt:learning.status==='approved'?timestamp:null},updatedAt:timestamp};
    if(!previous.exists)Object.assign(record,{id,title,skill:title,subject,weekNumber:learning.weekNumber,source:'teacher_original',classId:CLASS_ID});
    await ref.set(record,{merge:true});return {saved:true};
  }
  if(action==='learning_photo_read'){
    const id=safeId(body.id),ref=db.doc(`${base}/homeworkEvidence/${id}`),submission=await ref.get();
    const row=submission.data();
    if(!submission.exists||row.photoSource!=='learning-pilot-photo'||!rosterStudent(row.studentId))throw new AccessError('PHOTO_NOT_FOUND',404);
    if(row.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);
    let regions;try{regions=validateRegions(body.regions)}catch{throw new AccessError('REGIONS_INVALID',400)}
    const targetId=safeId(row.targetId||body.targetId),targetSnap=await db.doc(`${base}/curriculumTargets/${targetId}`).get(),target=targetSnap.data();
    if(!targetSnap.exists||target.learning?.status!=='approved'||isUnverifiedReading({...target,id:targetId}))throw new AccessError('CONTENT_NOT_AVAILABLE',404);
    const allowed=new Set((row.questionId?target.learning.questions.filter(q=>q.id===row.questionId):target.learning.questions).map(q=>q.id));
    if(regions.some(r=>!allowed.has(r.questionId)))throw new AccessError('REGIONS_INVALID',400);
    const revision=visualRevision(target);
    if(row.photoSourceRevision&&row.photoSourceRevision!==revision)throw new AccessError('CONTENT_CHANGED',409);
    const report=await processVisualPhoto(row.photoImage,{regions});
    await db.runTransaction(async tx=>{const current=await tx.get(ref),source=await tx.get(db.doc(`${base}/curriculumTargets/${targetId}`));
      if(current.data()?.photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);
      if(current.data()?.photoImage!==row.photoImage||current.data()?.targetId!==row.targetId||current.data()?.questionId!==row.questionId||current.data()?.photoSourceRevision!==row.photoSourceRevision||visualRevision(source.data())!==revision)throw new AccessError('CONTENT_CHANGED',409);
      tx.set(ref,{visualReport:report,targetId,photoSourceRevision:revision},{merge:true});});
    return {saved:true,status:report.status,academicScore:null,starGranted:false};
  }
  if(action==='learning_photo_assess'){
    const id=safeId(body.id),targetId=safeId(body.targetId);
    if(body.transcriptionVerified!==true)throw new AccessError('TRANSCRIPTION_REVIEW_REQUIRED',400);
    const submission=await db.doc(`${base}/homeworkEvidence/${id}`).get();
    const targetSnap=await db.doc(`${base}/curriculumTargets/${targetId}`).get();
    if(!submission.exists||submission.data().photoSource!=='learning-pilot-photo'||!rosterStudent(submission.data().studentId))throw new AccessError('PHOTO_NOT_FOUND',404);
    const target=targetSnap.data();
    if(!targetSnap.exists||target.learning?.status!=='approved'||isUnverifiedReading({...target,id:targetId}))throw new AccessError('CONTENT_NOT_AVAILABLE',404);
    if(submission.data().targetId&&submission.data().targetId!==targetId)throw new AccessError('CONTENT_CHANGED',409);
    if(submission.data().photoSourceRevision&&submission.data().photoSourceRevision!==visualRevision(target))throw new AccessError('CONTENT_CHANGED',409);
    const questions=submission.data().questionId?target.learning.questions.filter(q=>q.id===submission.data().questionId):target.learning.questions;
    let estimate;
    try{estimate=evaluateVerifiedPhotoAnswers(questions,body.answers)}catch{throw new AccessError('ANSWERS_INVALID',400)}
    const ref=db.doc(`${base}/homeworkEvidence/${id}`);
    const profileRef=db.doc(`${base}/studentProfiles/${submission.data().studentId}`);
    const starGranted=false;let feedback;
    await db.runTransaction(async tx=>{
      const current=await tx.get(ref);
      const profile=await tx.get(profileRef);
      if(!current.exists||current.data().studentId!==submission.data().studentId)throw new AccessError('PHOTO_NOT_FOUND',404);
      const source=await tx.get(db.doc(`${base}/curriculumTargets/${targetId}`));
      if(current.data().photoImage!==submission.data().photoImage||current.data().targetId!==submission.data().targetId||current.data().questionId!==submission.data().questionId||current.data().photoSourceRevision!==submission.data().photoSourceRevision||visualRevision(source.data())!==visualRevision(target))throw new AccessError('CONTENT_CHANGED',409);
      if(current.data().photoAssessment?.verified)throw new AccessError('PHOTO_ALREADY_ASSESSED',409);
      const memory=memoryOf(profile.data());
      const prior=memory.photoProgress?.[targetId];const questionScope=JSON.stringify(questions.map(q=>q.id).sort());
      feedback=photoFeedback({firstName:rosterStudent(submission.data().studentId)?.firstName,estimate,previousScore:prior?.sourceRevision===visualRevision(target)&&prior.questionScope===questionScope?prior.estimatedScore:null,questions});
      if(estimate.estimatedScore!==null){const progress={...(memory.photoProgress||{}),[targetId]:{estimatedScore:estimate.estimatedScore,sourceRevision:visualRevision(target),questionScope,at:timestamp,evidenceId:id}};
        const photoProgress=Object.fromEntries(Object.entries(progress).sort((a,b)=>String(b[1].at||'').localeCompare(String(a[1].at||''))).slice(0,40));
        tx.set(profileRef,{learningPilotMemory:{...memory,photoProgress}},{merge:true});}
      tx.set(ref,{photoAssessment:{...estimate,feedback,verified:estimate.estimatedScore!==null,estimated:true,targetId,answers:body.answers,sourceRevision:target.learning.approvedAt||target.learning.reference,assessedAt:timestamp,starGranted},photoStatus:estimate.estimatedScore===null?'pending_teacher_review':'reviewed',photoReviewedBy:'teacher',photoReviewedAt:timestamp,photoFeedback:feedback,photoStarEligible:false},{merge:true});
    });
    return {saved:true,...estimate,starGranted,feedback,officialGradeChanged:false};
  }
  if(action==='learning_photo_review'){
    const id=safeId(body.id),ref=db.doc(`${base}/homeworkEvidence/${id}`);
    const status=String(body.status||'');
    if(!['reviewed','needs_revision'].includes(status))throw new AccessError('REVIEW_STATUS_INVALID',400);
    const note=String(body.note||'').trim().slice(0,600);
    if(status==='needs_revision'&&!note)throw new AccessError('REVIEW_NOTE_REQUIRED',400);
    await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists||snap.data().photoSource!=='learning-pilot-photo'||!rosterStudent(snap.data().studentId))throw new AccessError('PHOTO_NOT_FOUND',404);
      if(!['pending_teacher_review','reviewed','needs_revision'].includes(snap.data().photoStatus))throw new AccessError('PHOTO_STATE_INVALID',409);
      const feedback=photoFeedback({firstName:rosterStudent(snap.data().studentId)?.firstName,status,reviewNote:note});
      tx.set(ref,{photoFeedback:feedback,photoStatus:status,photoReviewNote:note,photoReviewedAt:timestamp,photoReviewedBy:'teacher',photoRequiresTeacherReview:false},{merge:true});
    });
    return {saved:true,status,officialGradeChanged:false};
  }
  if(action==='learning_paper_result'){
    const id=safeId(body.id),ref=db.doc(`${base}/homeworkEvidence/${id}`),paper=await ref.get();
    if(!paper.exists||paper.data().kind!=='learning-pilot-paper'||!rosterStudent(paper.data().studentId))throw new AccessError('PAPER_NOT_FOUND',404);
    const record=paper.data(),results=body.results;
    const target=await db.doc(`${base}/curriculumTargets/${record.targetId}`).get();if(!target.exists||target.data().learning?.status!=='approved'||record.sourceRevision!==(target.data().learning.approvedAt||target.data().learning.reference))throw new AccessError('CONTENT_CHANGED',409);
    if(!Array.isArray(results)||results.length!==record.questions.length||results.some(x=>typeof x!=='boolean'))throw new AccessError('PAPER_RESULT_INVALID',400);
    const profile=pilotProfile(record.studentId);
    await db.runTransaction(async tx=>{const p=await tx.get(profile),memory=memoryOf(p.data());let next={...memory,attempts:(memory.attempts||[]).filter(a=>!a.id.startsWith(id+':'))};for(let i=0;i<results.length;i++)next=recordAttempt(next,{id:`${id}:${i}`,targetId:record.targetId,questionId:record.questions[i].id,correct:results[i],mode:'test',strategy:'teacher_review',errorType:'teacher_marked'},timestamp);tx.set(profile,{learningPilotMemory:next},{merge:true});tx.set(ref,{status:'graded',results,gradedAt:timestamp,gradedBy:'teacher'},{merge:true})});
    return {saved:true};
  }
  if(action==='learning_plan'){
    const studentId=safeId(body.studentId);if(!rosterStudent(studentId))throw new AccessError('STUDENT_NOT_FOUND',404);
    const targetId=safeId(body.targetId),id=body.id?safeId(body.id):`learning-${randomUUID()}`,ref=db.doc(`${base}/remediationPlans/${id}`),old=await ref.get();
    if(old.exists&&(old.data().studentId!==studentId||old.data().source!=='learning-pilot'))throw new AccessError('PLAN_ACCESS_DENIED',403);
    const target=await db.doc(`${base}/curriculumTargets/${targetId}`).get();if(!target.exists||target.data().learning?.status!=='approved')throw new AccessError('CONTENT_NOT_AVAILABLE',404);
    const status=['proposed','active','improved','needs_more_support','resolved'].includes(body.status)?body.status:'proposed';
    if(status==='resolved'&&!old.exists)throw new AccessError('PLAN_STATE_INVALID',400);
    const fileIds=[...new Set((Array.isArray(body.fileIds)?body.fileIds:old.data()?.fileIds||[]).map(safeId))].slice(0,8);
    for(const fileId of fileIds){const file=await db.doc(`${base}/files/${fileId}`).get();if(!file.exists||!canSeeFile(file.data(),studentId))throw new AccessError('FILE_ACCESS_DENIED',403)}
    const links=(Array.isArray(body.links)?body.links:old.data()?.links||[]).slice(0,8).map(link=>({label:String(link.label||'رابط تعليمي').slice(0,100),url:safeLink(link.url)}));
    const goal=String(body.goal||'').trim().slice(0,1000);if(!goal)throw new AccessError('GOAL_REQUIRED',400);
    await ref.set({id,studentId,targetId,source:'learning-pilot',status,goal,fileIds,links,instructions:String(body.instructions||'').slice(0,2000),dueDate:String(body.dueDate||'').slice(0,10),activities:(Array.isArray(body.activities)?body.activities:[]).map(x=>String(x).slice(0,600)).slice(0,12),approvedAt:status==='active'?(old.data()?.approvedAt||timestamp):old.data()?.approvedAt||null,startedAt:old.data()?.startedAt||timestamp,updatedAt:timestamp,...(status==='resolved'?{resolvedAt:timestamp}:{})},{merge:true});
    return {saved:true,id};
  }
  return null;
}
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function worksheetHtml({student,target,teacher=false,id,timestamp}){
  const questions=target.learning.questions||[];
  return `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تدريب ${escape(target.title)}</title><style>@font-face{font-family:LearningNaskh;src:url('/learning-font/NotoNaskhArabic-Regular.ttf') format('truetype')}@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:LearningNaskh,Tahoma,Arial,sans-serif;line-height:1.9;color:#111;max-width:178mm;margin:12mm auto;padding:4mm}h1{font-size:22px}h2{font-size:18px}section{break-inside:avoid;margin:8mm 0}.lines{height:22.706mm}.ruling-row{position:relative;height:10.16mm;margin-bottom:1.193mm;border:0.25mm solid #222;border-radius:2.3mm}.ruling-row i{position:absolute;inset-inline:3mm;height:0;border-top:0.194mm solid #b8b8b8;top:3.43mm}.ruling-row i+ i{top:calc(3.43mm + 2.787mm);border-color:#2e2e2e;border-width:0.22mm}.ruling-row{--book-pitch:11.353mm}footer{font-size:11px;border-top:1px solid #aaa;margin-top:10mm}.toolbar{display:flex;gap:12px;padding:10px;border:1px solid #aaa}button{min-height:44px}@media print{body{margin:0;padding:0}.toolbar{display:none}}</style><div class="toolbar"><button onclick="window.print()">طباعة أو حفظ PDF</button><span>اختر A4، ثم «حفظ بصيغة PDF» إذا كان جهازك يدعم ذلك.</span></div><h1>تعلّمت — ${teacher?'نسخة المعلم':'نسخة الطالب'}</h1><p>الطالب: ${escape(student.name)}<br>المهارة: ${escape(target.skill||target.title)}<br>التاريخ: ${escape(timestamp?.slice(0,10))}</p><p>اقرأ السؤال، ثم اكتب إجابتك في المساحة المخصصة.</p>${questions.slice(0,8).map((q,i)=>`<section><h2>${i+1}. ${escape(q.prompt)}</h2>${teacher?`<p>الإجابة: ${q.answers.map(escape).join(' / ')}</p>`:'<div class="lines"><div class="ruling-row"><i></i><i></i></div><div class="ruling-row"><i></i><i></i></div></div>'}</section>`).join('')}${teacher&&target.subject==='handwriting'?'<section><h2>معايير تصحيح الخط</h2><p>شكل الحرف، وموضعه على السطر، والاتصال والانفصال، والمسافات، ووضوح الكتابة.</p><p>يراجع المعلم كل معيار؛ هذا تدريب، ولا يستبدل التقييم الرسمي.</p></section>':''}<footer>معرف الورقة: ${escape(id)}<br>المصدر: ${escape(target.learning.reference)}<br>طباعة الورقة لا تعني إنجازها. إدخال النتيجة يتم من المعلم.<br>التسطير مطابق لنظام السطر الغامق والسطر الفاتح القريب في صفحة 2 من كتاب المعلم.</footer></html>`;
}
