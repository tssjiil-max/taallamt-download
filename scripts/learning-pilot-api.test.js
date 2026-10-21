import {requirePilot} from '../server/learning-pilot.js';
import {beforeEach,afterEach,test,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({docs:new Map(),reads:0,beforeRead:null}));
const clone=value=>value===undefined?undefined:structuredClone(value);
vi.mock('../server/firebase-admin.js',()=>{
  const snapshot=(path)=>{const value=clone(state.docs.get(path));return {id:path.split('/').at(-1),exists:state.docs.has(path),data:()=>clone(value)}};
  const doc=path=>({path,get:async()=>{state.reads++;state.beforeRead?.(path);return snapshot(path)},set:async(value,options)=>{state.docs.set(path,options?.merge?{...state.docs.get(path),...clone(value)}:clone(value))}});
  const collection=(path,filters=[])=>({where:(key,op,value)=>collection(path,[...filters,[key,value]]),get:async()=>{state.reads++;return {docs:[...state.docs.keys()].filter(key=>key.startsWith(path+'/')&&!key.slice(path.length+1).includes('/')&&filters.every(([field,value])=>state.docs.get(key)[field]===value)).map(snapshot)}}});
  const db={doc,collection,runTransaction:async fn=>fn({get:ref=>ref.get(),set:(ref,value,opts)=>ref.set(value,opts)})};
  return {adminDb:()=>db,previewWriteGuard:()=>{},adminStorageBucket:()=>{throw new Error('Storage must not be used by these tests')}};
});
import {studentPilotRead,studentPilotWrite,teacherPilotWrite} from '../server/learning-pilot.js';
import {DEMO_STUDENT_ID,DEMO_TARGET} from '../server/learning-pilot-demo.js';
import studentState from '../api/student-state.js';
const root='workspaces/second-4-staging';
const env={...process.env};
beforeEach(()=>{state.docs.clear();state.reads=0;state.beforeRead=null;process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='preview/shakabumbo-pilot-20261013';process.env.TAALLAMT_SESSION_SECRET='test-only-session-secret';process.env.TEACHER_ACCESS_CODE='test-only-access-code'});
afterEach(()=>{process.env={...env}});
const res=()=>({code:200,body:null,headers:{},status(code){this.code=code;return this},json(value){this.body=value;return this},send(value){this.body=value;return this},setHeader(key,value){this.headers[key]=value}});
const req=(studentId=DEMO_STUDENT_ID,extra={})=>({query:{view:'learning-pilot',studentId,pilot:'1',...extra},headers:{}});
test('Production rejects the synthetic pilot before reading any database record',async()=>{process.env.VERCEL_ENV='production';await expect(studentPilotRead(req(),res())).rejects.toMatchObject({code:'PILOT_NOT_AVAILABLE'});expect(state.reads).toBe(0)});
test('student without a valid own link cannot access learning records',async()=>{await expect(studentPilotRead(req('s2-4-02'),res())).rejects.toMatchObject({code:'STUDENT_ACCESS_REQUIRED'});expect(state.reads).toBe(0)});
test('another student invite cannot read learning data even if names match',async()=>{const token='test-invite-one-1234567890',other='test-invite-two-1234567890';state.docs.set(`${root}/studentProfiles/s2-4-02`,{guardianInviteToken:token});state.docs.set(`${root}/studentProfiles/s2-4-03`,{guardianInviteToken:other});await expect(studentPilotRead(req('s2-4-03',{invite:token}),res())).rejects.toMatchObject({code:'STUDENT_ACCESS_DENIED'})});
test('student API strips answers and unrelated private learning state',async()=>{const response=res();await studentPilotRead(req(),response);expect(response.body.activity.question.answers).toBeUndefined();expect(JSON.stringify(response.body)).not.toContain('guardianInviteToken');expect(response.body.student.id).toBe(DEMO_STUDENT_ID)});
test('valid attempt is server graded, persisted and retry does not count twice',async()=>{const body={action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,targetId:DEMO_TARGET.id,attemptId:'test1',questionId:'book',answer:'كتابٍ',mode:'test'};const first=res();await studentPilotWrite({headers:{}},first,body);expect(first.body.correct).toBe(true);const second=res();await studentPilotWrite({headers:{}},second,body);expect(second.body.duplicate).toBe(true);expect(state.docs.get(`${root}/studentProfiles/${DEMO_STUDENT_ID}`).learningPilotMemory.attempts).toHaveLength(1);expect([...state.docs.keys()].some(p=>p.includes('/assessments/'))).toBe(false)});
test('question cannot be changed by forging a correct field or arbitrary identifier',async()=>{await expect(studentPilotWrite({headers:{}},res(),{action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,targetId:DEMO_TARGET.id,attemptId:'test2',questionId:'not-issued',answer:'كتابٍ',correct:true})).rejects.toMatchObject({code:'ACTIVITY_CHANGED'});expect(state.docs.size).toBe(0)});
test('student cannot request a teacher answer-sheet copy',async()=>{await expect(studentPilotRead(req(DEMO_STUDENT_ID,{view:'learning-print',targetId:DEMO_TARGET.id,copy:'teacher'}),res())).rejects.toMatchObject({code:'TEACHER_AUTH_REQUIRED'})});
test('announcement read updates own synthetic profile without changing academic progress',async()=>{await studentPilotWrite({headers:{}},res(),{action:'announcement_read',pilot:true,studentId:DEMO_STUDENT_ID,id:'pilot-welcome'});const response=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'announcement-pilot'}),response);expect(response.body.unread).toBe(0);expect(state.docs.get(`${root}/studentProfiles/${DEMO_STUDENT_ID}`).learningPilotMemory).toBeUndefined()});
test('cross-student remediation plan edits are rejected',async()=>{state.docs.set(`${root}/remediationPlans/pilot-plan`,{studentId:'s2-4-02',source:'learning-pilot'});await expect(teacherPilotWrite('learning_plan',{id:'pilot-plan',studentId:'s2-4-03',targetId:'pilot:kasr',goal:'goal',status:'active'})).rejects.toMatchObject({code:'PLAN_ACCESS_DENIED'})});
test('paper generation records a worksheet but does not mark training as completed',async()=>{const response=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'learning-print',targetId:DEMO_TARGET.id}),response);expect(response.headers['Content-Type']).toContain('text/html');const papers=[...state.docs.values()].filter(x=>x.kind==='learning-pilot-paper');expect(papers).toHaveLength(1);expect(papers[0].status).toBe('printed');expect(papers[0].studentId).toBe(DEMO_STUDENT_ID);expect(state.docs.get(`${root}/studentProfiles/${DEMO_STUDENT_ID}`)?.learningPilotMemory).toBeUndefined();expect(papers[0].questions[0].answers).toBeUndefined()});
test('a remediation plan cannot attach a file owned by another student',async()=>{state.docs.set(`${root}/curriculumTargets/${DEMO_TARGET.id}`,DEMO_TARGET);state.docs.set(`${root}/files/private-file`,{visibility:'private',targetStudentIds:['s2-4-03']});await expect(teacherPilotWrite('learning_plan',{studentId:'s2-4-02',targetId:DEMO_TARGET.id,goal:'training',fileIds:['private-file']})).rejects.toMatchObject({code:'FILE_ACCESS_DENIED'})});
test('legacy student snapshot does not leak newly stored question answers',async()=>{const invite='test-private-invite-1234567890';state.docs.set(`${root}/studentProfiles/s2-4-02`,{guardianInviteToken:invite});state.docs.set(`${root}/curriculumTargets/${DEMO_TARGET.id}`,DEMO_TARGET);const response=res();await studentState({method:'GET',query:{studentId:'s2-4-02',invite},headers:{}},response);expect(response.code).toBe(200);expect(response.body.curriculum[0].learning).toBeUndefined();expect(JSON.stringify(response.body)).not.toContain('كتابٍ')});
test('expired and other-class announcements cannot expose their image',async()=>{const invite='test-private-invite-1234567890';state.docs.set(`${root}/studentProfiles/s2-4-02`,{guardianInviteToken:invite});for(const data of [{expiresAt:'2026-10-01'}, {classId:'other'}]){state.docs.set(`${root}/announcements/private-image`,{status:'published',imageDataUrl:'data:image/png;base64,YQ==',...data});const response=res();await studentState({method:'GET',query:{view:'announcement-image',pilot:'1',id:'private-image',studentId:'s2-4-02',invite},headers:{}},response);expect(response.code).toBe(404)}});
test('idempotency survives eviction from the bounded learning-memory window',async()=>{const body={action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,targetId:DEMO_TARGET.id,attemptId:'old-attempt',questionId:'book',answer:'كتابٍ',mode:'test'};await studentPilotWrite({headers:{}},res(),body);const profile=state.docs.get(`${root}/studentProfiles/${DEMO_STUDENT_ID}`);profile.learningPilotMemory.attempts=Array.from({length:200},(_,i)=>({id:String(i),targetId:DEMO_TARGET.id,questionId:'house',correct:true,mode:'test',at:'2026-10-01'}));const response=res();await studentPilotWrite({headers:{}},response,body);expect(response.body.duplicate).toBe(true);expect(profile.learningPilotMemory.attempts).toHaveLength(200)});
test('synthetic student profile photo saves in its isolated session and survives home reload',async()=>{const response=res();await studentState({method:'POST',query:{},headers:{},body:{action:'student_profile',studentId:DEMO_STUDENT_ID,pilot:true,demoSession:'photo-session-a',photoDataUrl:'data:image/jpeg;base64,YQ=='}},response);expect(response.code).toBe(200);const home=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'home',demoSession:'photo-session-a'}),home);expect(home.body.student.photo).toBe('data:image/jpeg;base64,YQ==');const other=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'home',demoSession:'photo-session-b'}),other);expect(other.body.student.photo).toBe('');expect(state.docs.has(`${root}/studentProfiles/${DEMO_STUDENT_ID}`)).toBe(false)});
test('synthetic photo rejects invalid payload and production writes',async()=>{for(const photoDataUrl of ['https://example.test/photo.jpg','data:image/jpeg;base64,'+'A'.repeat(280001)]){const response=res();await studentState({method:'POST',query:{},headers:{},body:{action:'student_profile',studentId:DEMO_STUDENT_ID,pilot:true,demoSession:'photo-validation',photoDataUrl}},response);expect(response.body.ok).toBe(false)}expect(state.docs.size).toBe(0);process.env.VERCEL_ENV='production';const response=res();await studentState({method:'POST',query:{},headers:{},body:{action:'student_profile',studentId:DEMO_STUDENT_ID,pilot:true,demoSession:'photo-validation',photoDataUrl:'data:image/jpeg;base64,YQ=='}},response);expect(response.code).toBe(404);expect(state.docs.size).toBe(0)});
test('Quran review is scoped to the current segment and never changes teacher mastery',async()=>{const read=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'learning-quran',demoSession:'quran-test'}),read);expect(read.body.segments).toHaveLength(3);const id=read.body.segments[0].id;const response=res();await studentPilotWrite({headers:{}},response,{action:'quran_review',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'quran-test',segmentId:id});expect(response.body.masteryChanged).toBe(false);expect([...state.docs.keys()].some(k=>k.includes('/assessments/'))).toBe(false);await expect(studentPilotWrite({headers:{}},res(),{action:'quran_review',pilot:true,studentId:DEMO_STUDENT_ID,segmentId:'arbitrary-future'})).rejects.toMatchObject({code:'QURAN_SCOPE_DENIED'})});
test('handwriting never accepts a student self-graded answer',async()=>{await expect(studentPilotWrite({headers:{}},res(),{action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,targetId:'demo:book-handwriting-7',attemptId:'handwriting',questionId:'q1',answer:'anything'})).rejects.toMatchObject({code:'TEACHER_REVIEW_REQUIRED'})});
test('teacher can review templates, save a draft, approve it and assign a plan without duplicating existing targets',async()=>{const {teacherPilotRead}=await import('../server/learning-pilot.js');const overview=await teacherPilotRead({});expect(overview.contentTemplates).toHaveLength(44);expect(overview.students).toHaveLength(30);const t=overview.contentTemplates.find(t=>t.subject==='spelling');state.docs.set(`${root}/curriculumTargets/existing`,{id:'existing',subject:'spelling',title:'existing',skill:t.title,weekNumber:3});await teacherPilotWrite('learning_content',{id:'existing',title:t.title,subject:'spelling',learning:t.learning});expect(state.docs.get(`${root}/curriculumTargets/existing`).learning.status).toBe('draft');await teacherPilotWrite('learning_content',{id:'existing',title:t.title,subject:'spelling',learning:{...t.learning,status:'approved'}});expect(state.docs.get(`${root}/curriculumTargets/existing`).weekNumber).toBe(3);expect(state.docs.get(`${root}/curriculumTargets/existing`).title).toBe('existing');await teacherPilotWrite('learning_plan',{studentId:'s2-4-02',targetId:'existing',goal:'three examples',status:'active'});expect([...state.docs.values()].some(row=>row.source==='learning-pilot'&&row.status==='active')).toBe(true)});

test('teacher photo review records feedback without setting an official grade',async()=>{
  const id='photo-review-sample',path=`${root}/homeworkEvidence/${id}`;
  state.docs.set(path,{id,studentId:'s2-4-02',homeworkId:'hw1',photoSource:'learning-pilot-photo',photoStatus:'pending_teacher_review',photoImage:'data:image/jpeg;base64,YQ=='});
  await expect(teacherPilotWrite('learning_photo_review',{id,status:'needs_revision',note:''})).rejects.toMatchObject({code:'REVIEW_NOTE_REQUIRED'});
  await teacherPilotWrite('learning_photo_review',{id,status:'needs_revision',note:'راجع ترتيب الحروف'});
  const row=state.docs.get(path);
  expect(row.photoStatus).toBe('needs_revision');
  expect(row.photoReviewNote).toBe('راجع ترتيب الحروف');
  expect(row.score).toBeUndefined();
  expect([...state.docs.keys()].some(p=>p.includes('/assessments/'))).toBe(false);
  await expect(teacherPilotWrite('learning_photo_review',{id:'missing',status:'reviewed'})).rejects.toMatchObject({code:'PHOTO_NOT_FOUND'});
});

test('reading exercises retain full passage answers and cannot be silently approved',async()=>{
  const {CONTENT_TEMPLATES}=await import('../server/teacher-content-bank.js');
  expect(CONTENT_TEMPLATES).toHaveLength(44);
  const lesson=CONTENT_TEMPLATES.find(t=>t.id==='original-arabic-8');
  expect(lesson.learning.questions[1].answers).toContain('في مزارع كثيرة في بلادي');
  expect(CONTENT_TEMPLATES.every(t=>t.learning.status==='draft')).toBe(true);
  expect(CONTENT_TEMPLATES.filter(t=>t.subject==='handwriting').every(t=>!t.learning.rulingVerified)).toBe(true);
});

test('unverified invented reading passages cannot be approved or shown to students',async()=>{
  await expect(teacherPilotWrite('learning_approve_reading',{})).rejects.toMatchObject({code:'SOURCE_VERIFICATION_REQUIRED'});
  const response=res();await studentPilotRead(req(DEMO_STUDENT_ID,{demoSession:'curriculum-check'}),response);
  expect(JSON.stringify(response.body)).not.toContain('نسي خالد أن يسقي النبتة');
});

test('photo estimated score requires verified transcription and an approved matching lesson',async()=>{
  const rootPhoto=`${root}/homeworkEvidence/review-grade-1`;
  state.docs.set(rootPhoto,{studentId:'s2-4-02',photoSource:'learning-pilot-photo',photoStatus:'pending_teacher_review'});
  await expect(teacherPilotWrite('learning_photo_assess',{id:'review-grade-1',targetId:'approved-lesson',answers:['أ','ب','ج']})).rejects.toMatchObject({code:'TRANSCRIPTION_REVIEW_REQUIRED'});
  state.docs.set(`${root}/curriculumTargets/approved-lesson`,{id:'approved-lesson',subject:'spelling',learning:{status:'approved',reference:'درس معتمد',questions:[{id:'q1',answers:['أ']},{id:'q2',answers:['ب']},{id:'q3',answers:['ج']}]}});
  const result=await teacherPilotWrite('learning_photo_assess',{id:'review-grade-1',targetId:'approved-lesson',answers:['أ','ب','ج'],transcriptionVerified:true});
  expect(result.estimatedScore).toBe(100);
  expect(result.starGranted).toBe(false);
  expect(result.officialGradeChanged).toBe(false);
  expect(state.docs.get(rootPhoto).photoAssessment.verified).toBe(true);
  const profile=state.docs.get(`${root}/studentProfiles/s2-4-02`);
  expect(profile.learningPilotMemory.learningStars||[]).toHaveLength(0);
  expect(profile.learningPilotMemory.photoProgress['approved-lesson'].estimatedScore).toBe(100);
  await expect(teacherPilotWrite('learning_photo_assess',{id:'review-grade-1',targetId:'approved-lesson',answers:['أ','ب','ج'],transcriptionVerified:true})).rejects.toMatchObject({code:'PHOTO_ALREADY_ASSESSED'});
  expect(profile.learningPilotMemory.learningStars||[]).toHaveLength(0);
  expect(profile.learningPilotMemory.photoProgress['approved-lesson'].estimatedScore).toBe(100);
  expect([...state.docs.keys()].filter(k=>k.includes('/assessments/'))).toHaveLength(0);
});

test('paper-answer photo requires own current approved question and a valid JPEG; never grants a mark on upload',async()=>{
  const read=res();
  await studentPilotRead(req(DEMO_STUDENT_ID,{demoSession:'paper-photo-student'}),read);
  const activity=read.body.activity;
  expect(activity).toBeTruthy();
  await expect(studentPilotWrite({headers:{}},res(),{action:'learning_activity_photo',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'paper-photo-student',targetId:activity.targetId,questionId:'not-assigned',image:'data:image/jpeg;base64,YQ=='})).rejects.toMatchObject({code:'ACTIVITY_CHANGED'});
  await expect(studentPilotWrite({headers:{}},res(),{action:'learning_activity_photo',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'paper-photo-student',targetId:activity.targetId,questionId:activity.question.id,image:'https://example.com/answer.jpg'})).rejects.toMatchObject({code:'PHOTO_INVALID'});
  expect([...state.docs.keys()].filter(key=>key.includes('/homeworkEvidence/'))).toHaveLength(0);
  expect([...state.docs.keys()].filter(key=>key.includes('/assessments/'))).toHaveLength(0);
});

test('an already reviewed paper-photo answer cannot be overwritten and lose its verified grade or star',async()=>{
  const demoSession='photo-lock-test';
  const view=res();
  await studentPilotRead(req(DEMO_STUDENT_ID,{demoSession}),view);
  const activity=view.body.activity;
  const {createHash}=await import('node:crypto');
  const id='activity-'+createHash('sha256').update([DEMO_STUDENT_ID+'_'+demoSession,activity.targetId,activity.question.id].join(':')).digest('hex').slice(0,40);
  const path=`${root}/homeworkEvidence/${id}`;
  state.docs.set(path,{studentId:DEMO_STUDENT_ID,photoSource:'learning-pilot-photo',photoAssessment:{verified:true,estimatedScore:100,starGranted:true}});
  await expect(studentPilotWrite({headers:{}},res(),{action:'learning_activity_photo',pilot:true,studentId:DEMO_STUDENT_ID,demoSession,targetId:activity.targetId,questionId:activity.question.id,image:'data:image/jpeg;base64,YQ=='})).rejects.toMatchObject({code:'PHOTO_ALREADY_ASSESSED'});
  expect(state.docs.get(path).photoAssessment.starGranted).toBe(true);
});

test('unreadable teacher transcription remains editable and cannot earn a star',async()=>{
 const path=`${root}/homeworkEvidence/unreadable-review`;
 state.docs.set(path,{studentId:'s2-4-02',photoSource:'learning-pilot-photo',photoImage:'same'});
 state.docs.set(`${root}/curriculumTargets/weighted`,{subject:'spelling',learning:{status:'approved',reference:'معتمد',questions:[{id:'q1',answers:['أ'],points:2},{id:'q2',answers:['ب'],points:3}]}});
 const first=await teacherPilotWrite('learning_photo_assess',{id:'unreadable-review',targetId:'weighted',answers:['أ',null],transcriptionVerified:true});
 expect(first.estimatedScore).toBe(null);expect(first.starGranted).toBe(false);expect(state.docs.get(path).photoAssessment.verified).toBe(false);
 const fixed=await teacherPilotWrite('learning_photo_assess',{id:'unreadable-review',targetId:'weighted',answers:['أ','ب'],transcriptionVerified:true});
 expect(fixed.estimatedScore).toBe(100);expect(state.docs.get(path).photoAssessment.verified).toBe(true);
});
test('assessment rejects a source or task changed after upload',async()=>{
 const {visualRevision}=await import('../server/visual-photo.js');
 const target={subject:'spelling',learning:{status:'approved',reference:'معتمد',questions:[{id:'q',answers:['صديقٍ']}]}};
 const path=`${root}/homeworkEvidence/source-review`;
 state.docs.set(path,{studentId:'s2-4-02',photoSource:'learning-pilot-photo',targetId:'linked',questionId:'q',photoSourceRevision:visualRevision(target)});
 state.docs.set(`${root}/curriculumTargets/linked`,{...target,learning:{...target.learning,reference:'إصدار جديد'}});
 await expect(teacherPilotWrite('learning_photo_assess',{id:'source-review',targetId:'linked',answers:['صديقٍ'],transcriptionVerified:true})).rejects.toMatchObject({code:'CONTENT_CHANGED'});
 expect(state.docs.get(path).photoAssessment).toBeUndefined();
});

test('concurrent re-binding cannot save an assessment from the old target',async()=>{
 const path=`${root}/homeworkEvidence/binding-race`;
 state.docs.set(path,{studentId:'s2-4-02',photoSource:'learning-pilot-photo',photoImage:'same'});
 state.docs.set(`${root}/curriculumTargets/source-a`,{subject:'spelling',learning:{status:'approved',reference:'معتمد',questions:[{id:'q1',answers:['أ']},{id:'q2',answers:['ب']},{id:'q3',answers:['ج']}]}});
 let count=0;state.beforeRead=p=>{if(p===path&&++count===2)state.docs.set(path,{...state.docs.get(path),targetId:'source-b',photoSourceRevision:'new-binding'})};
 await expect(teacherPilotWrite('learning_photo_assess',{id:'binding-race',targetId:'source-a',answers:['أ','ب','ج'],transcriptionVerified:true})).rejects.toMatchObject({code:'CONTENT_CHANGED'});
 expect(state.docs.get(path).photoAssessment).toBeUndefined();expect(state.docs.get(`${root}/studentProfiles/s2-4-02`)).toBeUndefined();
});
test('actual student HTTP handler routes paper-photo uploads, ignores forged assessment and persists OCR evidence',async()=>{
 const invalid=res();await studentState({method:'POST',query:{},headers:{},body:{action:'learning_activity_photo',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'http-upload',targetId:DEMO_TARGET.id,questionId:'book',image:'data:image/jpeg;base64,YQ=='}},invalid);
 expect(invalid.body.error).toBe('PHOTO_INVALID');
 const {default:sharp}=await import('sharp');
 const jpeg=await sharp({create:{width:700,height:700,channels:3,background:'white'}}).jpeg().toBuffer();
 const response=res();await studentState({method:'POST',query:{},headers:{},body:{action:'learning_activity_photo',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'http-upload',targetId:DEMO_TARGET.id,questionId:'book',image:'data:image/jpeg;base64,'+jpeg.toString('base64'),academicScore:100,starGranted:true,visualReport:{text:'كتابٍ',confidence:100},photoAssessment:{verified:true,estimatedScore:100}}},response);
 expect(response.code).toBe(200);expect(response.body.academicScore).toBe(null);expect(response.body.starGranted).toBe(false);
 const evidence=[...state.docs.values()].find(r=>r.photoSource==='learning-pilot-photo');
 expect(evidence.visualReport.engine).toContain('tesseract.js');expect(evidence.photoAssessment).toBe(null);expect(evidence.visualReport.readings[0].text).not.toBe('كتابٍ');
 const portfolio=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'learning-portfolio',demoSession:'http-upload'}),portfolio);expect(portfolio.body.submissions).toHaveLength(1);
 const otherSession=res();await studentPilotRead(req(DEMO_STUDENT_ID,{view:'learning-portfolio',demoSession:'different-session'}),otherSession);expect(otherSession.body.submissions).toHaveLength(0);
},15000);
test('photo encouragement uses the roster name, measured progress and no new star',async()=>{
 const {visualRevision}=await import('../server/visual-photo.js');const {rosterStudent}=await import('../server/roster.js');
 const target={subject:'spelling',learning:{status:'approved',reference:'معتمد',questions:[{id:'q1',answers:['أ']},{id:'q2',answers:['ب']},{id:'q3',answers:['ج']}]}};
 state.docs.set(`${root}/curriculumTargets/named`,target);
 state.docs.set(`${root}/homeworkEvidence/named-photo`,{studentId:'s2-4-02',photoSource:'learning-pilot-photo',photoImage:'same'});
 state.docs.set(`${root}/studentProfiles/s2-4-02`,{learningPilotMemory:{photoProgress:{named:{estimatedScore:40,sourceRevision:visualRevision(target),questionScope:JSON.stringify(['q1','q2','q3'])}},learningStars:[{id:'historical',week:'old',targetId:'old'}]}});
 const result=await teacherPilotWrite('learning_photo_assess',{id:'named-photo',targetId:'named',answers:['أ','ب','ج'],transcriptionVerified:true,firstName:'اسم مزور',feedback:{level:'excellent'}});
 expect(result.feedback.text).toContain(rosterStudent('s2-4-02').firstName);expect(result.feedback.text).not.toContain('اسم مزور');expect(result.feedback.progress).toBe('improved');expect(result.starGranted).toBe(false);
 expect(state.docs.get(`${root}/studentProfiles/s2-4-02`).learningPilotMemory.learningStars).toEqual([{id:'historical',week:'old',targetId:'old'}]);
});

test('a narrower question set cannot manufacture an improvement claim',async()=>{
 const {visualRevision}=await import('../server/visual-photo.js');
 const target={subject:'spelling',learning:{status:'approved',reference:'معتمد',questions:[{id:'q1',answers:['أ']},{id:'q2',answers:['ب']},{id:'q3',answers:['ج']}]}};
 state.docs.set(`${root}/curriculumTargets/scope`,target);
 state.docs.set(`${root}/homeworkEvidence/narrow-photo`,{studentId:'s2-4-02',targetId:'scope',questionId:'q1',photoSourceRevision:visualRevision(target),photoSource:'learning-pilot-photo'});
 state.docs.set(`${root}/studentProfiles/s2-4-02`,{learningPilotMemory:{photoProgress:{scope:{estimatedScore:33,sourceRevision:visualRevision(target),questionScope:JSON.stringify(['q1','q2','q3'])}}}});
 const r=await teacherPilotWrite('learning_photo_assess',{id:'narrow-photo',targetId:'scope',answers:['أ'],transcriptionVerified:true});
 expect(r.feedback.progress).toBe('not_compared');expect(r.feedback.text).not.toContain('تقدّمت');
});
test('interactive cycle grants one star and preserves attempts in portfolio without changing official grades',async()=>{
 const answers=[['book','كتابٍ'],['house','بيتٍ'],['friend','صديقٍ']];let last;
 for(const [questionId,answer] of answers){last=res();await studentPilotWrite({headers:{}},last,{action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'full-cycle',targetId:DEMO_TARGET.id,attemptId:'cycle-'+questionId,questionId,answer,mode:'test'});expect(last.body.correct).toBe(true)}
 expect(last.body.star.reason).toBeTruthy();const portfolio=res();await studentPilotRead({headers:{},query:{view:'learning-portfolio',pilot:'1',studentId:DEMO_STUDENT_ID,demoSession:'full-cycle'}},portfolio);expect(portfolio.body.stars).toHaveLength(1);expect(portfolio.body.trainingRecords).toHaveLength(3);expect([...state.docs.keys()].some(p=>p.includes('/assessments/'))).toBe(false);
 const retry=res();await studentPilotWrite({headers:{}},retry,{action:'learning_attempt',pilot:true,studentId:DEMO_STUDENT_ID,demoSession:'full-cycle',targetId:DEMO_TARGET.id,attemptId:'cycle-friend',questionId:'friend',answer:'صديقٍ',mode:'test'});expect(retry.body.duplicate).toBe(true);
});

test('foundation activates for all 30 authorized roster identities and supports Islamic answer correction and teacher stop',async()=>{
 const {teacherPilotRead}=await import('../server/learning-pilot.js');
 const invite='foundation-test-invite-1234567890';
 for(const id of ['s2-4-02','s2-4-03'])state.docs.set(`${root}/studentProfiles/${id}`,{guardianInviteToken:invite});
 const overview=await teacherPilotRead({});
 expect(overview.students).toHaveLength(30);
 for(const student of overview.students){expect(new Set(student.skills.map(s=>s.subject))).toEqual(new Set(['arabic','spelling','handwriting','islamic']))}
 const read=res();await studentPilotRead(req('s2-4-02',{targetId:'foundation-faith',invite}),read);
 expect(read.body.activity.question.prompt).toBe('من ربك؟');expect(read.body.activity.question.answers).toBeUndefined();
 const write=res();await studentPilotWrite({headers:{}},write,{action:'learning_attempt',pilot:true,studentId:'s2-4-02',invite,targetId:'foundation-faith',attemptId:'islamic-one',questionId:'q1',answer:'الله',mode:'test'});
 expect(write.body.correct).toBe(true);
 const other=res();await studentPilotRead(req('s2-4-03',{targetId:'foundation-faith',invite}),other);expect(other.body.activity.question.id).toBe('q1');
 const target=overview.targets.find(t=>t.id==='foundation-faith');
 await teacherPilotWrite('learning_content',{id:target.id,title:target.title,subject:target.subject,learning:{...target.learning,status:'draft'}});
 const stopped=res();await studentPilotRead(req('s2-4-02',{targetId:target.id,invite}),stopped);expect(stopped.body.activity).toBeNull();
 await expect(studentPilotWrite({headers:{}},res(),{action:'learning_attempt',pilot:true,studentId:'s2-4-02',invite,targetId:target.id,attemptId:'after-stop',questionId:'q2',answer:'الإسلام'})).rejects.toMatchObject({code:'CONTENT_NOT_AVAILABLE'});
 expect([...state.docs.keys()].filter(p=>p.includes('/assessments/'))).toHaveLength(0);
});

test('P0 isolated Preview branch is allowed but arbitrary and production branches stay blocked',async()=>{const {requirePilot}=await import('../server/learning-pilot.js');expect(()=>requirePilot({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'preview/shakabumbo-p0-20261019'})).not.toThrow();expect(()=>requirePilot({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'other'})).toThrow();expect(()=>requirePilot({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'preview/shakabumbo-p0-20261019'})).toThrow()});

test('real tutor context comes from the authorized catalog without answer keys',async()=>{const {readTutorLesson}=await import('../server/learning-pilot.js');const c=await readTutorLesson({headers:{}},{studentId:DEMO_STUDENT_ID,targetId:'pilot:kasr',questionId:'book',assessment:true});expect(c.subject).toBe('spelling');expect(c.explanation).toContain('تنوين الكسر');expect(c.hint).toBe('');expect(c.answers).toBeUndefined();expect(c.student).toBeUndefined();await expect(readTutorLesson({headers:{}},{studentId:DEMO_STUDENT_ID,targetId:'invented',questionId:'book'})).rejects.toMatchObject({code:'LESSON_NOT_FOUND'})});

test('standalone model demo never uses the Firestore reserved bare demo id',async()=>{const paths=[];state.beforeRead=p=>paths.push(p);const {readTutorLesson}=await import('../server/learning-pilot.js');await readTutorLesson({headers:{}},{studentId:DEMO_STUDENT_ID,targetId:'pilot:kasr',questionId:'book',assessment:false,demoSession:''});expect(paths.some(p=>p.endsWith('/__shakabumbo_demo__'))).toBe(false)});

test('audio repair Preview is allowed while Production and unrelated branches remain blocked',()=>{
 expect(()=>requirePilot({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'fix/shakabumbo-audio-20261020'})).not.toThrow();
 expect(()=>requirePilot({VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'fix/shakabumbo-audio-20261020'})).toThrow();
 expect(()=>requirePilot({VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'unrelated'})).toThrow();
});

// The daily flow reuses the same stable guardian access and isolated profile records.
import {dailyRead,dailyWrite} from '../server/daily-learning-api.js';
afterEach(()=>vi.useRealTimers());
function seedDaily(){
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T09:00:00Z'));
 const studentId='s2-4-02',invite='daily-test-invite-1234567890';
 const target={id:'daily-approved',subject:'arabic',weekNumber:8,title:'الصديقان',learning:{status:'approved',reference:'الكتاب',explanation:'شرح معتمد',weekNumber:8,questions:[1,2,3].map(i=>({id:'q'+i,prompt:'سؤال '+i,answers:['صحيح'],hint:'راجع الشرح'}))}};
 state.docs.set(`${root}/studentProfiles/${studentId}`,{guardianInviteToken:invite});
 state.docs.set(`${root}/curriculumTargets/${target.id}`,target);
 state.docs.set(`${root}/weeklyPlans/daily-plan`,{weekNumber:8,subject:'arabic',lesson:'الصديقان',targetIds:[target.id],publishStatus:'published',days:[{weekday:2}]});
 return {studentId,invite,target};
}
test('daily student read denies another invite and strips teacher gaps, settings and answers',async()=>{const a=seedDaily();const response=res();await dailyRead({headers:{},query:{studentId:a.studentId,invite:a.invite}},response);expect(response.body.lessons.length).toBeGreaterThan(0);expect(JSON.stringify(response.body)).not.toContain('answers');expect(response.body.gaps).toBeUndefined();expect(response.body.settings).toBeUndefined();await expect(dailyRead({headers:{},query:{studentId:'s2-4-03',invite:a.invite}},res())).rejects.toMatchObject({code:'STUDENT_ACCESS_DENIED'})});
test('daily self test writes own portfolio atomically and durable retry cannot award twice',async()=>{const a=seedDaily(),body={studentId:a.studentId,invite:a.invite,attemptId:'daily-attempt',lessonId:'daily-plan:d2',answers:{q1:'صحيح',q2:'صحيح',q3:'صحيح'}};const response=res();await dailyWrite({headers:{}},response,body);expect(response.body.correct).toBe(3);expect(response.body.official).toBe(false);const again=res();await dailyWrite({headers:{}},again,body);expect(again.body.duplicate).toBe(true);const memory=state.docs.get(`${root}/studentProfiles/${a.studentId}`).learningPilotMemory;expect(memory.selfTests).toHaveLength(1);expect(memory.learningStars).toHaveLength(1);expect([...state.docs.keys()].filter(k=>k.includes('/portfolioEvents/'))).toHaveLength(1);expect([...state.docs.keys()].some(k=>k.includes('/assessments/'))).toBe(false)});
test('daily submission refuses hidden and unavailable lessons',async()=>{const a=seedDaily();state.docs.set(`${root}/settings/dailyLearning`,{overrides:{'daily-plan:d2':{hidden:true}}});await expect(dailyWrite({headers:{}},res(),{studentId:a.studentId,invite:a.invite,attemptId:'hidden-attempt',lessonId:'daily-plan:d2',answers:{}})).rejects.toMatchObject({code:'CONTENT_NOT_AVAILABLE'});expect(state.docs.get(`${root}/studentProfiles/${a.studentId}`).learningPilotMemory).toBeUndefined()});
test('daily APIs remain unavailable in Production before any database reads',async()=>{process.env.VERCEL_ENV='production';await expect(dailyRead({headers:{},query:{studentId:'s2-4-02'}},res())).rejects.toMatchObject({code:'PILOT_NOT_AVAILABLE'});expect(state.reads).toBe(0)});

test('permanent share survives two deployment changes without touching profile or achievements',async()=>{
 const studentId='s2-4-02',token='permanent-test-token-1234567890';
 const profile={studentId,guardianInviteToken:token,name:'fixture',learningPilotMemory:{stars:7}};
 state.docs.set(`${root}/studentProfiles/${studentId}`,profile);
 state.docs.set(`${root}/portfolioEvents/e1`,{studentId,title:'fixture evidence'});
 const before=clone([...state.docs]);
 process.env.TEACHER_PREVIEW_PASSWORDLESS='enabled';process.env.VERCEL_GIT_COMMIT_REF='fix/shakabumbo-audio-20261020';process.env.STUDENT_PUBLIC_ORIGIN='https://school.example';
 const urls=[];for(const host of ['first.vercel.app','second.vercel.app','third.vercel.app']){const response=res();await studentState({method:'POST',query:{},headers:{host,origin:`https://${host}`},body:{action:'access_share',studentId}},response);expect(response.code).toBe(200);urls.push(response.body.shareUrl)}
 expect(new Set(urls).size).toBe(1);expect(new URL(urls[0]).host).toBe('school.example');expect([...state.docs]).toEqual(before);
});
test('access status is private and revocation refuses writes before backup',async()=>{
 const studentId='s2-4-02';state.docs.set(`${root}/studentProfiles/${studentId}`,{guardianInviteToken:'a'.repeat(32)});const before=clone([...state.docs]);
 const denied=res();await studentState({method:'GET',query:{studentId,view:'access-status'},headers:{}},denied);expect(denied.code).toBe(401);
 process.env.TEACHER_PREVIEW_PASSWORDLESS='enabled';process.env.VERCEL_GIT_COMMIT_REF='fix/shakabumbo-audio-20261020';delete process.env.STUDENT_ACCESS_BACKUP_ID;
 const response=res();await studentState({method:'POST',query:{},headers:{host:'school.example',origin:'https://school.example'},body:{action:'access_revoke',studentId}},response);expect(response.body.error).toBe('RESTORABLE_BACKUP_REQUIRED');expect([...state.docs]).toEqual(before);
});
