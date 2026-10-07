// End-to-end journeys through the real API handlers against an in-memory Firestore stand-in:
// automation -> both sites, quick assessment + focused list + undo, Quran follow-up, homework, stars, permissions.
import assert from 'node:assert/strict';
import {register} from 'node:module';

register('./lib/fake-firebase-hooks.mjs',import.meta.url);

// Fixed clock so the journeys do not depend on the day the script runs.
const RealDate=Date;let nowMs=RealDate.parse('2026-10-04T04:30:00Z');           // Sunday 07:30 Asia/Riyadh, curriculum week 6
class FakeDate extends RealDate{constructor(...args){if(args.length)super(...args);else super(nowMs)}static now(){return nowMs}}
globalThis.Date=FakeDate;
const setNow=iso=>{nowMs=RealDate.parse(iso)};

process.env.VERCEL_ENV='preview';
process.env.FIREBASE_PROJECT_ID='fake';process.env.FIREBASE_CLIENT_EMAIL='fake@fake';process.env.FIREBASE_PRIVATE_KEY='fake-private-key';
const TEACHER_CODE='journey-test-code-2468';
process.env.TEACHER_ACCESS_CODE=TEACHER_CODE;
delete process.env.QURAN_TEACHER_PIN;delete process.env.CRON_SECRET;

const {fakeStore}=await import('./lib/fake-firestore.mjs');
const automation=(await import('../api/learning-automation.js')).default;
const studentState=(await import('../api/student-state.js')).default;
const homeworkComplete=(await import('../api/homework-complete.js')).default;
const starAdjust=(await import('../api/star-adjust.js')).default;
const studentEvaluation=(await import('../api/student-evaluation.js')).default;
const teacherPortfolio=(await import('../api/teacher-portfolio.js')).default;
const libraryFiles=(await import('../api/library-files.js')).default;
const remediation=(await import('../api/remediation-suggestions.js')).default;
const cronDaily=(await import('../api/cron-daily.js')).default;
const cronWeekly=(await import('../api/cron-weekly.js')).default;
const backendStatus=(await import('../api/backend-status.js')).default;
const actionSmoke=(await import('../api/action-smoke.js')).default;
const {WORKSPACE_ID,PRODUCTION_WORKSPACE_ID}=await import('../server/class-roster.js');
const {ROSTER}=await import('../server/roster.js');
const {teacherGate}=await import('../server/access.js');

const HOST='staging.example.test';
function call(handler,{method='GET',query={},body,cookie='',origin=`https://${HOST}`,ip='198.51.100.7'}={}){
  return new Promise((resolve,reject)=>{
    const res={statusCode:200,headers:{},status(code){this.statusCode=code;return this},setHeader(name,value){this.headers[name.toLowerCase()]=value;return this},
      json(payload){resolve({status:this.statusCode,body:payload,headers:this.headers})},send(payload){resolve({status:this.statusCode,body:payload,headers:this.headers})}};
    const headers={host:HOST,'x-real-ip':ip};if(method==='POST'&&origin)headers.origin=origin;if(cookie)headers.cookie=cookie;
    Promise.resolve(handler({method,query,body,headers},res)).catch(reject);
  });
}
const docs=prefix=>[...fakeStore.keys()].filter(key=>key.startsWith(`workspaces/${WORKSPACE_ID}/${prefix}/`));
const doc=path=>fakeStore.get(`workspaces/${WORKSPACE_ID}/${path}`);
const checks=[];
const check=(name,fn)=>checks.push([name,fn]);

let teacher='';                                   // teacher session cookie
const T=(action,query={})=>call(automation,{query:{action,...query},cookie:teacher});
const TP=(action,body={})=>call(automation,{method:'POST',body:{action,...body},cookie:teacher});
const invites={};
const home=async id=>(await call(studentState,{query:{view:'home',studentId:id,invite:invites[id]}})).body;
const [s1,s2,s3,s4,s5,s6,s7,s8]=ROSTER.map(student=>student.id);

check('Staging data lives in its own workspace, apart from Production',async()=>{
  assert.notEqual(WORKSPACE_ID,PRODUCTION_WORKSPACE_ID);
  const status=(await call(backendStatus)).body;
  assert.equal(status.dataWorkspace,'staging');assert.equal(status.teacherGateConfigured,true);
});

check('teacher tools answer 401 without a session (nothing is open to the public)',async()=>{
  for(const action of ['overview','teacher_home','assess_view','plan_week','homework_day'])assert.equal((await call(automation,{query:{action,subjectKey:'arabic'}})).status,401,action);
  for(const action of ['assess_one','assess_bulk','assess_undo','focus_set','plan_edit','homework_send','homework_edit','ensure','seed','daily','weekly','class_homework'])assert.equal((await call(automation,{method:'POST',body:{action}})).status,401,action);
  assert.equal((await call(starAdjust,{method:'POST',body:{studentId:s1,delta:1}})).status,401);
  assert.equal((await call(studentEvaluation,{method:'POST',body:{studentId:s1,action:'academic',targetId:'auto:arabic:w06',result:'mastered'}})).status,401);
  assert.equal((await call(studentState,{method:'POST',body:{studentId:s1,action:'assessment',academic:[{targetId:'x',result:'mastered'}]}})).status,401);
  assert.equal((await call(studentState,{method:'POST',body:{studentId:s1,action:'access_share'}})).status,401);
  assert.equal((await call(teacherPortfolio)).status,401);
  assert.equal((await call(libraryFiles,{query:{role:'teacher'}})).status,401);
  assert.equal((await call(remediation)).status,401);
  assert.equal((await call(automation,{query:{action:'quran-teacher-roster'}})).status,401);
  assert.equal((await call(automation,{method:'POST',body:{action:'quran-teacher-login',pin:'2468'}})).status,401,'the old PIN login no longer exists');
  assert.equal((await call(studentState,{query:{action:'smoke'}})).status,401,'smoke checks are not public');
  assert.equal((await call(actionSmoke)).status,401);
  assert.equal((await call(libraryFiles)).status,401,'nothing is listed without a session or a student link');
});

check('teacher sign-in: wrong code is refused, the right code opens a signed session',async()=>{
  assert.equal((await call(automation,{query:{action:'session'}})).body.teacher,false);
  const wrong=await call(automation,{method:'POST',body:{action:'login',code:'0000'}});
  assert.equal(wrong.status,401);assert.equal(wrong.body.error,'TEACHER_CODE_INVALID');
  const crossSite=await call(automation,{method:'POST',body:{action:'login',code:TEACHER_CODE},origin:'https://evil.example'});
  assert.equal(crossSite.status,403);
  const good=await call(automation,{method:'POST',body:{action:'login',code:` ${TEACHER_CODE.toUpperCase()} `}});
  assert.equal(good.status,200);
  const cookie=String(good.headers['set-cookie']);
  assert.ok(/HttpOnly/.test(cookie)&&/Secure/.test(cookie)&&/SameSite=Lax/.test(cookie));
  teacher=cookie.split(';')[0];
  assert.equal((await call(automation,{query:{action:'session'},cookie:teacher})).body.teacher,true);
  assert.equal((await call(automation,{query:{action:'session'},cookie:teacher.slice(0,-3)+'abc'})).body.teacher,false,'a tampered session is rejected');
  assert.equal((await call(automation,{method:'POST',body:{action:'assess_bulk',subjectKey:'arabic'},cookie:teacher,origin:'https://evil.example'})).status,403,'cross-site writes are refused even with the cookie');
});

check('repeated wrong codes lock that client only; a short configured code is refused as a gate',async()=>{
  const ip='203.0.113.9';
  for(let attempt=0;attempt<8;attempt++)assert.equal((await call(automation,{method:'POST',body:{action:'login',code:`bad-${attempt}`},ip})).status,401);
  const locked=await call(automation,{method:'POST',body:{action:'login',code:TEACHER_CODE},ip});
  assert.equal(locked.status,429);assert.equal(locked.body.error,'TEACHER_LOGIN_LOCKED');
  assert.equal((await call(automation,{method:'POST',body:{action:'login',code:TEACHER_CODE},ip:'203.0.113.10'})).status,200,'another client is not locked out');
  process.env.TEACHER_ACCESS_CODE='2468';
  try{assert.equal(teacherGate().configured,false);assert.equal(teacherGate().reason,'TEACHER_CODE_TOO_SHORT');assert.equal((await call(automation,{query:{action:'teacher_home'},cookie:teacher})).status,503)}
  finally{process.env.TEACHER_ACCESS_CODE=TEACHER_CODE}
});

check('without TEACHER_ACCESS_CODE the staging gate still verifies a code (never open)',async()=>{
  const saved=process.env.TEACHER_ACCESS_CODE;delete process.env.TEACHER_ACCESS_CODE;
  try{const gate=teacherGate();assert.equal(gate.configured,true);assert.equal(gate.source,'staging');assert.equal(gate.check('0000-0000-0000'),false);assert.equal(gate.check(''),false)}
  finally{process.env.TEACHER_ACCESS_CODE=saved}
});

check('the plan and the homework are published by the scheduled job alone (teacher site never opened)',async()=>{
  assert.equal(docs('weeklyPlans').length,0);
  const run=await call(cronDaily);
  assert.equal(run.status,200);assert.equal(run.body.week,6);
  const plans=docs('weeklyPlans');assert.equal(plans.length,4,'one plan record per subject');
  const arabic=doc('weeklyPlans/auto-week:1448-f1-w06:arabic');
  assert.equal(arabic.lesson,'عذرًا يا جدي');assert.equal(arabic.page,45);assert.equal(arabic.publishStatus,'published');assert.equal(arabic.source,'automation');
  assert.ok(arabic.generatedAt&&arabic.publishedAt&&arabic.classId&&arabic.schoolId&&arabic.termId,'source, week and timestamps are kept');
  const log=doc('automationRuns/2026-10-04');assert.equal(log.firstSource,'cron-daily');assert.equal(log.weeklyPublished,true);
});

check('Lughati homework is the copy / handwriting exercise with lesson and page',async()=>{
  const hw=doc('homework/auto-homework:2026-10-04:arabic');
  assert.ok(hw,'published on a Lughati day');
  assert.equal(hw.lesson,'عذرًا يا جدي');assert.equal(hw.page,45);assert.equal(hw.exercise,'تمرين الخط والنسخ');assert.equal(hw.taskType,'copywriting');
  assert.ok(hw.task.includes('الخط والنسخ')&&hw.task.includes('٤٥'));
  assert.equal(hw.scheduledDate,'2026-10-04');assert.equal(hw.dueDate,'2026-10-05');assert.ok(hw.publishedAt);
  assert.equal(docs('homeworkEvidence').filter(key=>key.includes('auto-homework:2026-10-04:arabic_')).length,ROSTER.length,'one record per student');
});

check('running the automation again creates no duplicates',async()=>{
  const before={plans:docs('weeklyPlans').length,homework:docs('homework').length,evidence:docs('homeworkEvidence').length,publishedAt:doc('weeklyPlans/auto-week:1448-f1-w06:arabic').publishedAt};
  setNow('2026-10-04T06:00:00Z');
  await call(cronDaily);await call(cronDaily);await TP('ensure');await T('teacher_home');
  assert.deepEqual({plans:docs('weeklyPlans').length,homework:docs('homework').length,evidence:docs('homeworkEvidence').length,publishedAt:doc('weeklyPlans/auto-week:1448-f1-w06:arabic').publishedAt},before);
});

check('the same plan and homework reach the teacher and the right student',async()=>{
  for(const id of [s1,s2,s3])invites[id]=(await call(studentState,{method:'POST',body:{studentId:id,action:'access_share'},cookie:teacher})).body.inviteToken;
  const teacherHome=(await T('teacher_home')).body,student=await home(s1);
  assert.equal(teacherHome.plan.published,true);assert.equal(student.plan.published,true);
  assert.deepEqual(student.plan.items.map(item=>[item.subjectKey,item.lesson,item.skill,item.page]),teacherHome.plan.items.map(item=>[item.subjectKey,item.lesson,item.skill,item.page]));
  assert.deepEqual(student.plan.items.map(item=>item.subjectKey),['arabic','quran','islamic','spelling'],'subject order from the right');
  assert.deepEqual(teacherHome.homework.items.map(item=>item.id).sort(),student.homework.today.map(item=>item.id).sort());
  assert.equal(student.homework.today.find(item=>item.subjectKey==='arabic').page,45);
  assert.equal(student.student.id,s1);assert.equal(teacherHome.students.length,ROSTER.length);
});

check('a student link opens only its own student',async()=>{
  assert.equal((await call(studentState,{query:{view:'home',studentId:s1}})).status,401,'no link');
  assert.equal((await call(studentState,{query:{view:'home',studentId:s2,invite:invites[s1]}})).status,403,'another student\'s link');
  assert.equal((await call(studentState,{query:{view:'home',studentId:s1,invite:'x'.repeat(32)}})).status,403,'forged link');
  assert.equal((await call(studentState,{query:{studentId:s2,inviteToken:invites[s1]}})).status,403,'legacy snapshot too');
  assert.equal((await call(studentState,{query:{studentId:s2}})).status,401);
  assert.equal((await call(homeworkComplete,{method:'POST',body:{studentId:s2,homeworkId:'auto-homework:2026-10-04:arabic',invite:invites[s1]}})).status,403);
  assert.equal((await call(starAdjust,{method:'POST',body:{studentId:s1,delta:1,invite:invites[s1]}})).status,401,'a student cannot change stars');
  assert.equal((await call(automation,{method:'POST',body:{action:'assess_one',subjectKey:'arabic',studentId:s1,result:'mastered',invite:invites[s1]}})).status,401,'a student cannot change an assessment');
  assert.equal((await call(homeworkComplete,{method:'POST',body:{studentId:s1,homeworkId:'auto-homework:2026-10-04:arabic'},cookie:teacher,origin:'https://evil.example'})).status,403,'the teacher cookie is not honoured for cross-site writes');
  assert.equal((await call(homeworkComplete,{method:'POST',body:{studentId:s1,homeworkId:'a/b',invite:invites[s1]}})).status,400);
  assert.equal((await call(libraryFiles,{query:{studentId:s2,inviteToken:invites[s1]}})).status,403);
  assert.equal((await call(libraryFiles,{query:{studentId:s1,inviteToken:invites[s1]}})).status,200);
});

check('focused follow-up list: saved, and never shown to students or guardians',async()=>{
  for(const id of [s2,s3])assert.equal((await TP('focus_set',{studentId:id,focused:true})).status,200);
  assert.equal((await TP('focus_set',{studentId:s4,focused:true,subjectKey:'arabic'})).status,200);
  const view=(await T('assess_view',{subjectKey:'arabic'})).body;
  assert.equal(view.scope.week,6);assert.equal(view.scope.skill,'ترتيب الكلمات وتكوين جملة مفيدة','the week skill comes from the curriculum');
  assert.deepEqual(view.students.filter(student=>student.focused).map(student=>student.id),[s2,s3,s4]);
  assert.equal(view.counts.focused,3);assert.equal(view.counts.rest,ROSTER.length-3);
  assert.equal((await T('assess_view',{subjectKey:'islamic'})).body.counts.focused,2,'a per-subject entry does not leak into other subjects');
  for(const payload of [await home(s2),(await call(studentState,{query:{studentId:s2,inviteToken:invites[s2]}})).body]){
    const text=JSON.stringify(payload);
    assert.ok(!text.includes('focused')&&!text.includes('assessmentGroup')&&!text.includes('focusBySubject')&&!text.includes('المتابعة المركزة'));
  }
});

check('"أتقن بقية الطلاب" marks everyone outside the focused list with one request',async()=>{
  const bulk=(await TP('assess_bulk',{subjectKey:'arabic',mode:'rest'})).body;
  assert.equal(bulk.written,ROSTER.length-3);assert.equal(bulk.skippedFocused,3);
  const view=(await T('assess_view',{subjectKey:'arabic'})).body;
  assert.equal(view.counts.mastered,ROSTER.length-3);assert.equal(view.counts.focusedPending,3);
  assert.ok(view.students.filter(student=>student.focused).every(student=>student.result===null));
  assert.equal(view.lastBulk.count,ROSTER.length-3);
  assert.equal((await TP('assess_bulk',{subjectKey:'arabic',mode:'rest'})).body.written,0,'pressing again writes nothing');
  assert.equal(docs('assessments').length,ROSTER.length-3,'one record per student, week and subject');
  assert.equal((await T('assess_view',{subjectKey:'islamic'})).body.counts.assessed,0,'other skills are untouched');
  assert.equal((await T('assess_view',{subjectKey:'arabic',week:9})).status,400,'a week that has not started cannot be assessed');
  assert.equal((await TP('assess_one',{subjectKey:'arabic',week:'x',studentId:s1,result:'mastered'})).status,400);
});

check('a result saved from the older student file is respected by the bulk buttons',async()=>{
  const saved=await call(studentEvaluation,{method:'POST',body:{studentId:s8,action:'academic',targetId:'auto:islamic:w06',result:'not_mastered'},cookie:teacher});
  assert.equal(saved.status,200);
  const bulk=(await TP('assess_bulk',{subjectKey:'islamic',mode:'all'})).body;
  assert.equal(bulk.written,ROSTER.length-1);assert.equal(bulk.skippedExisting,1);
  assert.equal((await T('assess_view',{subjectKey:'islamic'})).body.students.find(student=>student.id===s8).result,'not_mastered');
  assert.equal((await TP('assess_undo',{subjectKey:'islamic'})).body.undone,ROSTER.length-1);
  assert.equal((await T('assess_view',{subjectKey:'islamic'})).body.counts.assessed,1);
});

check('focused students are assessed one by one, and each student sees only his own result',async()=>{
  assert.equal((await TP('assess_one',{subjectKey:'arabic',studentId:s2,result:'needs_repeat'})).status,200);
  assert.equal((await TP('assess_one',{subjectKey:'arabic',studentId:s3,result:'not_mastered'})).status,200);
  assert.equal((await TP('assess_one',{subjectKey:'arabic',studentId:s2,result:'excellent'})).status,400);
  const status=async id=>(await home(id)).assessment.items.find(item=>item.subjectKey==='arabic').status;
  assert.equal(await status(s1),'mastered');assert.equal(await status(s2),'needs_repeat');assert.equal(await status(s3),'not_mastered');
  const view=(await T('assess_view',{subjectKey:'arabic'})).body;
  assert.equal(view.students.find(student=>student.id===s4).result,null,'not assessed yet stays empty');
  assert.equal((await home(s1)).assessment.items.find(item=>item.subjectKey==='islamic').status,null);
});

check('how a result was entered (bulk or individual) is never sent to a guardian',async()=>{
  for(const id of [s1,s2]){
    const legacy=(await call(studentState,{query:{studentId:id,inviteToken:invites[id]}})).body,text=JSON.stringify([legacy,await home(id)]);
    assert.ok(legacy.assessments.length>0);
    assert.ok(!text.includes('"mode"')&&!text.includes('opId')&&!text.includes('bulk_'),'no entry mode or operation id');
  }
});

check('teacher summary: each student counts once today, focused list size, unread messages',async()=>{
  const before=(await T('teacher_home')).body;
  assert.equal(before.summary.students,ROSTER.length);assert.equal(before.summary.focused,2,'the general focused list (a per-subject entry is not counted)');
  assert.equal(before.summary.assessedToday,ROSTER.length-1,'everyone assessed in Lughati today except the one focused student still waiting');
  assert.equal(before.summary.messages,0,'no guardian has written yet');assert.equal(before.messages,undefined);
  await TP('assess_one',{subjectKey:'spelling',studentId:s1,result:'mastered'});
  const after=(await T('teacher_home')).body;
  assert.equal(after.summary.assessedToday,before.summary.assessedToday,'a second subject for the same student does not add to the count');
  assert.equal(after.todayAssessments.filter(entry=>entry.studentId===s1).length,2);
  assert.deepEqual(after.students.find(student=>student.id===s2).week,{arabic:'needs_repeat',quran:null,islamic:null,spelling:null});
  assert.equal(after.students.find(student=>student.id===s4).assessedToday,false);
  await TP('assess_one',{subjectKey:'spelling',studentId:s1,result:null});
  const student=await home(s1);
  assert.equal(student.student.school,'مدرسة عمرو بن أوس الثقفي');assert.ok(!JSON.stringify(student).includes('summary":{"students'));
});

check('a student can set his own hobbies and picture, not another student\'s',async()=>{
  const save=(id,invite,body)=>call(studentState,{method:'POST',body:{studentId:id,action:'student_profile',invite,...body}});
  assert.equal((await save(s1,invites[s1],{hobbies:['القراءة','الرسم']})).status,200);
  assert.deepEqual((await home(s1)).student.hobbies,['القراءة','الرسم']);
  assert.equal((await save(s2,invites[s1],{hobbies:['x']})).status,403);
  assert.equal((await save(s1,invites[s1],{photoDataUrl:'javascript:alert(1)'})).status,400);
  assert.equal((await save(s1,invites[s1],{photoDataUrl:'data:image/jpeg;base64,'+'A'.repeat(64)})).status,200);
  assert.ok((await home(s1)).student.photo.startsWith('data:image/jpeg;base64,'));
  assert.equal((await save(s1,invites[s1],{removePhoto:true})).status,200);
  assert.equal((await home(s1)).student.photo,'','removing the picture returns to the default');
});

check('a result can be corrected, and the last bulk press can be undone without losing corrections',async()=>{
  await TP('assess_one',{subjectKey:'arabic',studentId:s5,result:'needs_repeat'});          // correction of a bulk result
  const undo=(await TP('assess_undo',{subjectKey:'arabic'})).body;
  assert.equal(undo.undone,ROSTER.length-4);assert.equal(undo.kept,1);
  const view=(await T('assess_view',{subjectKey:'arabic'})).body;
  assert.equal(view.counts.assessed,3);assert.equal(view.students.find(student=>student.id===s5).result,'needs_repeat');
  assert.equal(view.students.find(student=>student.id===s2).result,'needs_repeat','individual results survive the undo');
  assert.equal(view.lastBulk,null);
  assert.equal((await TP('assess_undo',{subjectKey:'arabic'})).body.undone,0);
  await TP('assess_one',{subjectKey:'arabic',studentId:s5,result:null});
  assert.equal((await T('assess_view',{subjectKey:'arabic'})).body.students.find(student=>student.id===s5).result,null,'clearing returns to not assessed');
});

check('"أتقن جميع الطلاب" covers everyone but never overwrites an existing result',async()=>{
  const all=(await TP('assess_bulk',{subjectKey:'arabic',mode:'all'})).body;
  assert.equal(all.written,ROSTER.length-2);assert.equal(all.skippedExisting,2);
  const view=(await T('assess_view',{subjectKey:'arabic'})).body;
  assert.equal(view.counts.assessed,ROSTER.length);assert.equal(view.counts.needs_repeat,1);assert.equal(view.counts.not_mastered,1);
});

check('Quran follow-up: memorisation only, same quick flow, behind the teacher session',async()=>{
  assert.equal((await call(automation,{query:{action:'assess_view',subjectKey:'quran'}})).status,401);
  const view=(await T('assess_view',{subjectKey:'quran'})).body;
  assert.equal(view.scope.week,6);assert.equal(view.scope.unit,'الفجر');assert.equal(view.scope.lesson,'الآيات 1 - 18');
  assert.ok(!JSON.stringify(view).includes('تلاوة'));
  assert.equal((await TP('assess_bulk',{subjectKey:'quran',mode:'rest'})).body.written,ROSTER.length-2);
  await TP('assess_one',{subjectKey:'quran',studentId:s2,result:'needs_repeat'});
  const record=doc(`quranFollowups/1448-f1_second-4_w06_${s2}`);
  assert.equal(record.status,'NEEDS_REPEAT');assert.equal(record.surah,'الفجر');
  const quran=(await home(s2)).quran;
  assert.equal(quran.current.status,'needs_repeat');assert.equal(quran.counts.needs_repeat,1);
  assert.equal((await home(s1)).quran.current.status,'mastered');
  assert.equal((await T('assess_view',{subjectKey:'quran',week:18})).status,400,'weeks that have not started (and the exam weeks) cannot be assessed');
  assert.equal((await TP('assess_bulk',{subjectKey:'quran',week:18,mode:'all'})).status,400);
  assert.ok((await T('assess_view',{subjectKey:'quran'})).body.weeks.every(item=>item.week<=6));
});

check('student marks homework done -> the teacher follow-up updates; it is not an assessment',async()=>{
  const id='auto-homework:2026-10-04:quran',islamicBefore=(await T('assess_view',{subjectKey:'islamic'})).body.counts.assessed;
  assert.equal((await call(homeworkComplete,{method:'POST',body:{studentId:s1,homeworkId:id,invite:invites[s1]}})).status,200);
  const item=(await T('teacher_home')).body.homework.items.find(entry=>entry.id===id);
  assert.equal(item.done,1);assert.equal(item.students.find(student=>student.id===s1).confirmedBy,'guardian');assert.equal(item.approved,0);
  assert.equal((await home(s1)).homework.today.find(entry=>entry.id===id).done,true);
  assert.equal((await T('assess_view',{subjectKey:'islamic'})).body.counts.assessed,islamicBefore,'no automatic «أتقن»');
  assert.equal((await home(s1)).stars.count,0,'no automatic stars');
  await call(homeworkComplete,{method:'POST',body:{studentId:s1,homeworkId:id,invite:invites[s1],undo:true}});
  assert.equal((await T('teacher_home')).body.homework.items.find(entry=>entry.id===id).done,0);
  await call(homeworkComplete,{method:'POST',body:{studentId:s1,homeworkId:id,invite:invites[s1]}});
  assert.equal((await TP('homework_review',{homeworkId:id,studentId:s1,approved:true})).status,200);
  assert.equal((await T('teacher_home')).body.homework.items.find(entry=>entry.id===id).approved,1,'teacher approval is tracked separately');
});

check('stars: granted by the teacher, reach the balance and the log, and a retry never doubles them',async()=>{
  const give=requestId=>call(starAdjust,{method:'POST',body:{studentId:s1,delta:1,requestId},cookie:teacher});
  assert.equal((await give('r1')).body.stars,1);assert.equal((await give('r1')).body.stars,1,'same request again');assert.equal((await give('r2')).body.stars,2);
  const stars=(await home(s1)).stars;
  assert.equal(stars.count,2);assert.equal(stars.goal,30);assert.equal(stars.log.length,2);
  assert.equal((await T('teacher_home')).body.students.find(student=>student.id===s1).stars,2);
  assert.equal((await home(s2)).stars.count,0);
});

check('an exceptional edit by the teacher reaches the students',async()=>{
  assert.equal((await TP('plan_edit',{week:6,subjectKey:'islamic',note:'اختبار قصير يوم الأربعاء'})).status,200);
  assert.equal((await home(s3)).plan.items.find(item=>item.subjectKey==='islamic').note,'اختبار قصير يوم الأربعاء');
  await call(cronDaily);
  assert.equal((await home(s3)).plan.items.find(item=>item.subjectKey==='islamic').note,'اختبار قصير يوم الأربعاء','the automation keeps the edit');
  const sent=(await TP('homework_send',{requestId:'extra1',title:'نسخ جملة',task:'انسخ الجملة الأولى من درس «عذرًا يا جدي» ثلاث مرات.',subjectKey:'arabic'})).body;
  assert.equal(sent.students,ROSTER.length);
  assert.equal((await TP('homework_send',{requestId:'extra1',title:'نسخ جملة',task:'x'})).body.duplicate,true);
  assert.ok((await home(s2)).homework.today.some(item=>item.id===sent.id&&item.source==='teacher_class'));
  await TP('homework_edit',{homeworkId:'auto-homework:2026-10-04:quran',task:'حفظ الآيات 1 - 8 من سورة الفجر مع المراجعة.'});
  await call(cronDaily);
  assert.equal((await home(s2)).homework.today.find(item=>item.id==='auto-homework:2026-10-04:quran').task,'حفظ الآيات 1 - 8 من سورة الفجر مع المراجعة.','automation does not overwrite the edit');
});

check('everything is still there after a fresh read (persistence)',async()=>{
  const first=await home(s2),again=await home(s2);
  const {generatedAt:_a,...one}=first,{generatedAt:_b,...two}=again;
  assert.deepEqual(one,two);
  assert.equal((await T('assess_view',{subjectKey:'arabic'})).body.counts.assessed,ROSTER.length);
});

check('spelling homework follows the week\'s spelling skill (Thursday), without repeating the Lughati task',async()=>{
  setNow('2026-10-08T02:05:00Z');                                              // Thursday 05:05 Asia/Riyadh
  await call(cronDaily);
  const hw=doc('homework/auto-homework:2026-10-08:spelling');
  assert.ok(hw);assert.equal(hw.skill,'تنوين الفتح');assert.ok(hw.task.includes('تنوين الفتح'));assert.equal(hw.dueDate,'2026-10-11','due on the next school day');
  assert.equal(doc('homework/auto-homework:2026-10-08:arabic'),undefined);
  assert.equal(doc('automationRuns/2026-10-08').firstSource,'cron-daily');
  const response=JSON.stringify((await call(cronDaily)).body);
  assert.ok(!response.includes('s2-4-')&&!response.includes('studentId'),'the scheduled job answers with counts only');
});

check('catch-up: if the scheduled job is missed, the first read by a student publishes the day',async()=>{
  setNow('2026-10-11T05:00:00Z');                                              // Sunday of week 7, no cron ran
  assert.equal(doc('weeklyPlans/auto-week:1448-f1-w07:arabic'),undefined);
  const student=await home(s1);
  assert.equal(student.plan.week,7);assert.equal(student.plan.published,true);
  assert.equal(student.plan.items[0].lesson,'الصديقان');assert.equal(student.plan.items[0].page,69);
  assert.ok(student.homework.today.some(item=>item.id==='auto-homework:2026-10-11:arabic'));
  assert.equal(doc('automationRuns/2026-10-11').firstSource,'catchup');
  assert.equal((await home(s1)).assessment.items.find(item=>item.subjectKey==='arabic').status,null,'a new week starts not assessed');
  assert.equal((await call(studentState,{query:{view:'week',week:6,studentId:s1,invite:invites[s1]}})).body.plan.items[0].lesson,'عذرًا يا جدي','previous weeks stay reviewable');
});

check('the weekly job publishes the coming week on Saturday; weekends and holidays publish no homework',async()=>{
  setNow('2026-10-17T05:00:00Z');                                              // Saturday 08:00 Asia/Riyadh
  const before=docs('homework').length;
  const weekly=await call(cronWeekly);
  assert.equal(weekly.status,200);assert.equal(weekly.body.weekly.week,8);
  assert.equal(doc('weeklyPlans/auto-week:1448-f1-w08:spelling').skill,'الشدة');
  assert.equal((await home(s1)).plan.week,8);
  assert.equal(docs('homework').length,before,'no homework on a weekend');
  setNow('2026-11-22T05:00:00Z');                                              // Sunday of the autumn break (week 13)
  const holiday=await home(s1);
  assert.equal(holiday.plan.holiday,true);assert.equal(holiday.homework.today.length,0);
  setNow('2026-11-29T05:00:00Z');                                              // first Sunday after the break (calendar week 14)
  const after=await home(s1);
  assert.equal(after.plan.items.find(item=>item.subjectKey==='quran').unit,'البروج');assert.equal(after.quran.currentWeek,13,'Quran teaching week 13 follows the break');
  assert.equal(after.plan.items.find(item=>item.subjectKey==='quran').lesson,'الآيات 1 - 10');
});

check('nothing is published after the term ends',async()=>{
  setNow('2027-03-01T05:00:00Z');
  const before={plans:docs('weeklyPlans').length,homework:docs('homework').length};
  const run=(await call(cronDaily)).body;
  assert.equal(run.skipped,'OUTSIDE_TERM');
  assert.equal((await call(cronWeekly)).body.skipped,'OUTSIDE_TERM');
  await home(s1);
  assert.deepEqual({plans:docs('weeklyPlans').length,homework:docs('homework').length},before);
});

// ---------- guardian ↔ teacher messages ----------
const G=(id,action,body={},extra={})=>call(studentState,{method:'POST',body:{studentId:id,action,invite:invites[id],...body},...extra});
const thread=id=>call(studentState,{query:{view:'messages',studentId:id,invite:invites[id]}});
check('messages: a guardian writes, the teacher receives it, replies, and the guardian reads the reply',async()=>{
  setNow('2026-10-04T05:00:00Z');
  const empty=(await thread(s1)).body;
  assert.equal(empty.messages.length,0);assert.equal(empty.canSend,true);
  const sent=await G(s1,'message_send',{text:'  السلام عليكم، هل يوجد واجب اليوم؟  ',clientId:'client-msg-0001'});
  assert.equal(sent.status,200);assert.equal(sent.body.duplicate,false);assert.equal(sent.body.message.text,'السلام عليكم، هل يوجد واجب اليوم؟');assert.equal(sent.body.message.from,'guardian');
  const stored=doc(`messages/${sent.body.message.id}`);
  assert.equal(stored.studentId,s1);assert.equal(stored.classId,'second-4');assert.ok(stored.teacherId&&stored.schoolId&&stored.createdAt);
  // teacher side: the counter and the inbox
  const summary=(await T('teacher_home')).body.summary;assert.equal(summary.messages,1,'«رسائل جديدة» counts the unread incoming message');
  const inbox=(await T('messages_inbox')).body;
  assert.equal(inbox.unread,1);assert.equal(inbox.threads.length,1);assert.equal(inbox.threads[0].studentId,s1);assert.equal(inbox.threads[0].unread,1);assert.equal(inbox.threads[0].last.from,'guardian');
  const opened=(await T('messages_thread',{studentId:s1})).body;
  assert.equal(opened.messages.length,1);assert.equal(opened.messages[0].mine,false);assert.equal(opened.messages[0].unread,true);
  assert.equal((await TP('messages_mark_read',{studentId:s1})).body.marked,1);
  assert.equal((await T('teacher_home')).body.summary.messages,0,'opening the conversation clears the counter');
  assert.ok((await thread(s1)).body.messages[0].readAt,'the guardian sees that the message was read');
  setNow('2026-10-04T05:10:00Z');
  const reply=await TP('message_reply',{studentId:s1,text:'وعليكم السلام، نعم: تمرين الخط والنسخ.',clientId:'client-rep-0001'});
  assert.equal(reply.status,200);assert.equal(reply.body.message.from,'teacher');
  const student=await home(s1);
  assert.deepEqual(student.messages,{total:2,unread:1,canSend:true});
  const seen=(await thread(s1)).body;
  assert.deepEqual(seen.messages.map(message=>[message.from,message.mine,message.unread]),[['guardian',true,false],['teacher',false,true]]);
  assert.equal(seen.messages[1].text,'وعليكم السلام، نعم: تمرين الخط والنسخ.');
  assert.equal((await G(s1,'messages_read')).body.marked,1);
  assert.equal((await home(s1)).messages.unread,0);
  assert.ok((await T('messages_thread',{studentId:s1})).body.messages[1].readAt,'the teacher sees that the reply was read');
});
check('messages: a retry with the same id never stores the message twice',async()=>{
  const first=await G(s2,'message_send',{text:'شكرًا لكم',clientId:'client-dup-0001'});
  const again=await G(s2,'message_send',{text:'شكرًا لكم',clientId:'client-dup-0001'});
  assert.equal(first.body.duplicate,false);assert.equal(again.status,200);assert.equal(again.body.duplicate,true);assert.equal(again.body.message.id,first.body.message.id);
  assert.equal((await thread(s2)).body.messages.length,1);
  const replyA=await TP('message_reply',{studentId:s2,text:'العفو',clientId:'client-dup-0002'}),replyB=await TP('message_reply',{studentId:s2,text:'العفو',clientId:'client-dup-0002'});
  assert.equal(replyB.body.duplicate,true);assert.equal(replyB.body.message.id,replyA.body.message.id);
  assert.equal((await thread(s2)).body.messages.length,2);
});
check('messages: the sender comes from the verified link or session, never from what the browser sends',async()=>{
  // no link, a wrong link, another student's link
  assert.equal((await call(studentState,{method:'POST',body:{studentId:s1,action:'message_send',text:'x',clientId:'client-bad-0001'}})).status,401);
  assert.equal((await call(studentState,{method:'POST',body:{studentId:s1,action:'message_send',invite:'x'.repeat(32),text:'x',clientId:'client-bad-0002'}})).status,403);
  assert.equal((await call(studentState,{method:'POST',body:{studentId:s1,action:'message_send',invite:invites[s2],text:'x',clientId:'client-bad-0003'}})).status,403,'a guardian cannot write into another student\'s conversation');
  assert.equal((await call(studentState,{query:{view:'messages',studentId:s1,invite:invites[s2]}})).status,403,'a guardian cannot read another student\'s conversation');
  assert.equal((await call(studentState,{query:{view:'messages',studentId:s1}})).status,401);
  // a teacher session without the guardian's link reads the thread but cannot post in the guardian's name
  const preview=await call(studentState,{query:{view:'messages',studentId:s1},cookie:teacher});
  assert.equal(preview.status,200);assert.equal(preview.body.canSend,false);
  const asGuardian=await call(studentState,{method:'POST',body:{studentId:s1,action:'message_send',text:'x',clientId:'client-bad-0004'},cookie:teacher});
  assert.equal(asGuardian.status,403);assert.equal(asGuardian.body.error,'GUARDIAN_LINK_REQUIRED');
  // claiming to be the teacher in the body changes nothing
  const spoof=await G(s1,'message_send',{text:'رسالة عادية',clientId:'client-spoof-001',from:'teacher',studentId:s1,teacherId:'teacher:other'});
  assert.equal(spoof.body.message.from,'guardian');assert.equal(doc(`messages/${spoof.body.message.id}`).from,'guardian');
  // the teacher endpoints need the teacher session
  assert.equal((await call(automation,{query:{action:'messages_inbox'}})).status,401);
  assert.equal((await call(automation,{query:{action:'messages_thread',studentId:s1}})).status,401);
  assert.equal((await call(automation,{method:'POST',body:{action:'message_reply',studentId:s1,text:'x',clientId:'client-bad-0005'}})).status,401);
  assert.equal((await call(automation,{method:'POST',body:{action:'message_reply',studentId:s1,text:'x',clientId:'client-bad-0006'},cookie:teacher,origin:'https://evil.example'})).status,403);
  // one guardian's thread never contains another student's messages
  assert.ok((await thread(s2)).body.messages.every(message=>!message.text.includes('واجب اليوم')));
});
check('messages: empty, oversized and malformed messages are refused; nothing is stored for them',async()=>{
  const before=docs('messages').length;
  assert.equal((await G(s1,'message_send',{text:'   ',clientId:'client-val-0001'})).body.error,'TEXT_REQUIRED');
  const long=await G(s1,'message_send',{text:'ا'.repeat(1001),clientId:'client-val-0002'});assert.equal(long.status,400);assert.equal(long.body.error,'MESSAGE_TOO_LONG');
  assert.equal((await G(s1,'message_send',{text:'مرحبا',clientId:'x'})).body.error,'CLIENT_ID_INVALID');
  assert.equal((await G(s1,'message_send',{text:'مرحبا',clientId:'../../etc/passwd'})).body.error,'CLIENT_ID_INVALID');
  assert.equal((await TP('message_reply',{studentId:'nobody',text:'مرحبا',clientId:'client-val-0003'})).status,404);
  assert.equal(docs('messages').length,before);
});
check('messages: older conversations are kept; the counter follows unread incoming messages only',async()=>{
  setNow('2026-10-04T06:00:00Z');
  await G(s3,'message_send',{text:'متى اختبار الإملاء؟',clientId:'client-old-0001'});
  assert.equal((await T('teacher_home')).body.summary.messages,3,'one unread message from each of three guardians');
  setNow('2026-10-20T06:00:00Z');                                                      // sixteen days later
  const inbox=(await T('messages_inbox')).body;
  assert.equal(inbox.threads.length,3,'nothing was deleted by time');
  assert.equal(inbox.threads.find(item=>item.studentId===s3).unread,1);
  assert.equal((await T('teacher_home')).body.summary.messages,3);
  assert.equal((await thread(s1)).body.messages.length,3);
  for(const id of [s1,s2,s3])await TP('messages_mark_read',{studentId:id});
  assert.equal((await T('teacher_home')).body.summary.messages,0);
  setNow('2026-10-04T06:00:00Z');
});

// ---------- «شكابمبو — مساعد المعلم» ----------
const realFetch=globalThis.fetch;
function stubFetch(reply){const calls=[];globalThis.fetch=async(url,options={})=>{calls.push({url:String(url),headers:options.headers||{},body:JSON.parse(options.body||'{}')});return reply(String(url))};return calls}
const json=(status,payload)=>({ok:status>=200&&status<300,status,json:async()=>payload});
check('assistant: without a key it is «غير مفعّل» and never answers',async()=>{
  delete process.env.OPENAI_API_KEY;delete process.env.GEMINI_API_KEY;
  const calls=stubFetch(()=>json(200,{}));
  try{
    assert.equal((await call(automation,{query:{action:'assistant_status'}})).status,401,'teacher session required');
    const status=(await T('assistant_status')).body;
    assert.equal(status.providers.openai.configured,false);assert.equal(status.providers.gemini.configured,false);
    assert.equal(status.providers.openai.keyEnv,'OPENAI_API_KEY');assert.equal(status.providers.gemini.keyEnv,'GEMINI_API_KEY');
    assert.equal(status.context.week,6);assert.equal(status.context.subjects.find(item=>item.subjectKey==='arabic').lesson,'عذرًا يا جدي');
    assert.equal(status.context.subjects.find(item=>item.subjectKey==='arabic').page,45);assert.equal(status.context.subjects.find(item=>item.subjectKey==='islamic').page,null);
    const asked=await TP('assistant_ask',{provider:'openai',task:'explain_lesson',subjectKey:'arabic'});
    assert.equal(asked.status,503);assert.equal(asked.body.error,'ASSISTANT_NOT_CONFIGURED');assert.equal(asked.body.keyEnv,'OPENAI_API_KEY');assert.equal(asked.body.answer,undefined);
    assert.equal(calls.length,0,'no request leaves the server');
    assert.equal((await call(automation,{method:'POST',body:{action:'assistant_ask',provider:'openai',task:'explain_lesson',subjectKey:'arabic'}})).status,401);
  }finally{globalThis.fetch=realFetch}
});
check('assistant: the request goes to the chosen provider only, with curriculum context and without student names',async()=>{
  process.env.OPENAI_API_KEY='test-openai-key-000000000000000000';process.env.GEMINI_API_KEY='test-gemini-key-000000000000000000';
  const calls=stubFetch(url=>url.includes('openai')?json(200,{status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'شرح مقترح للدرس.'}]}]}):json(200,{candidates:[{finishReason:'STOP',content:{parts:[{text:'نشاط مقترح.'}]}}]}));
  try{
    const name=ROSTER[2].name;
    const openai=await TP('assistant_ask',{provider:'openai',task:'explain_lesson',subjectKey:'arabic',question:`ركّز على ${name} لأنه ضعيف`});
    assert.equal(openai.status,200);assert.equal(openai.body.answer,'شرح مقترح للدرس.');assert.equal(openai.body.provider,'openai');
    assert.deepEqual([openai.body.source.label,openai.body.source.week,openai.body.source.lesson,openai.body.source.page],['لغتي',6,'عذرًا يا جدي',45]);
    assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.openai.com/v1/responses');
    assert.equal(calls[0].headers.authorization,'Bearer test-openai-key-000000000000000000');
    const sentText=JSON.stringify(calls[0].body);
    assert.ok(sentText.includes('عذرًا يا جدي')&&sentText.includes('رقم الصفحة: 45')&&sentText.includes('الأسبوع الدراسي: 6'),'the lesson, page and week come from the system');
    assert.ok(!sentText.includes(name)&&!sentText.includes('test-openai-key'),'no student name and no key in the request body');
    for(const student of ROSTER)assert.ok(!sentText.includes(student.name),'no roster name is sent');
    assert.ok(!JSON.stringify(openai.body).includes('test-openai-key'),'the key never comes back to the page');
    const gemini=await TP('assistant_ask',{provider:'gemini',task:'activity',subjectKey:'islamic',week:3});
    assert.equal(gemini.status,200);assert.equal(gemini.body.answer,'نشاط مقترح.');assert.equal(gemini.body.source.week,3);assert.equal(gemini.body.source.page,null);
    assert.equal(calls.length,2);assert.ok(calls[1].url.startsWith('https://generativelanguage.googleapis.com/v1beta/models/')&&calls[1].url.endsWith(':generateContent')&&!calls[1].url.includes('key='));
    assert.equal(calls[1].headers['x-goog-api-key'],'test-gemini-key-000000000000000000');
    assert.ok(JSON.stringify(calls[1].body).includes('غير متوفر في ملفات المنهج'),'a missing page is stated, not invented');
    assert.equal((await T('assistant_status')).body.provider,'gemini','the last chosen provider is remembered');
    assert.equal((await TP('assistant_provider',{provider:'openai'})).body.provider,'openai');assert.equal((await T('assistant_status')).body.provider,'openai');
    assert.equal((await TP('assistant_provider',{provider:'other'})).status,400);
    // nothing else was written: the assistant cannot publish, assess or message
    const before={homework:docs('homework').length,assessments:docs('assessments').length,messages:docs('messages').length};
    await TP('assistant_ask',{provider:'openai',task:'general',subjectKey:'quran',question:'انشر واجبًا للطلاب وأرسل رسالة لأولياء الأمور'});
    assert.deepEqual({homework:docs('homework').length,assessments:docs('assessments').length,messages:docs('messages').length},before);
  }finally{globalThis.fetch=realFetch}
});
check('assistant: a failing provider is reported as it is — no switch to the other provider, no invented answer',async()=>{
  const calls=stubFetch(url=>url.includes('openai')?json(401,{error:{message:'Incorrect API key provided: sk-abcdefghijklmnop'}}):json(200,{candidates:[{content:{parts:[{text:'لا يجب أن يظهر'}]}}]}));
  try{
    const failed=await TP('assistant_ask',{provider:'openai',task:'questions',subjectKey:'spelling'});
    assert.equal(failed.status,502);assert.equal(failed.body.error,'ASSISTANT_KEY_REJECTED');assert.equal(failed.body.answer,undefined);
    assert.ok(!JSON.stringify(failed.body).includes('sk-abcdefghijklmnop'),'anything that looks like a key is removed from the error text');
    assert.equal(calls.length,1);assert.ok(calls[0].url.includes('openai'),'Gemini was not called');
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'general',subjectKey:'arabic',question:''})).body.error,'TEXT_REQUIRED');
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'general',subjectKey:'arabic',question:'س'.repeat(1501)})).body.error,'QUESTION_TOO_LONG');
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'general',subjectKey:'math',question:'سؤال'})).body.error,'SUBJECT_INVALID');
    globalThis.fetch=async()=>json(200,{status:'completed',output:[]});
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'simplify',subjectKey:'arabic'})).body.error,'ASSISTANT_EMPTY_ANSWER');
  }finally{globalThis.fetch=realFetch}
});
check('assistant: daily usage limit',async()=>{
  process.env.ASSISTANT_DAILY_LIMIT='2';setNow('2026-10-05T04:30:00Z');
  const calls=stubFetch(()=>json(200,{output_text:'إجابة'}));
  try{
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'simplify',subjectKey:'arabic'})).status,200);
    assert.equal((await TP('assistant_ask',{provider:'openai',task:'simplify',subjectKey:'arabic'})).body.usage.used,2);
    const third=await TP('assistant_ask',{provider:'openai',task:'simplify',subjectKey:'arabic'});
    assert.equal(third.status,429);assert.equal(third.body.error,'ASSISTANT_DAILY_LIMIT');assert.equal(calls.length,2);
  }finally{globalThis.fetch=realFetch;delete process.env.ASSISTANT_DAILY_LIMIT;delete process.env.OPENAI_API_KEY;delete process.env.GEMINI_API_KEY;setNow('2026-10-04T06:00:00Z')}
});
check('library: upload with each sharing option; a student sees only what is shared with him',async()=>{
  const upload=(body)=>call(libraryFiles,{method:'POST',body:{name:'file.txt',mimeType:'text/plain',base64:Buffer.from('نص').toString('base64'),category:'worksheets',...body},cookie:teacher});
  assert.equal((await call(libraryFiles,{method:'POST',body:{title:'x',name:'f.txt',mimeType:'text/plain',base64:'eA==',visibility:'public'}})).status,401);
  assert.equal((await upload({title:'للجميع',visibility:'public'})).status,201);
  assert.equal((await upload({title:'لطالب واحد',visibility:'private',targetStudentIds:[s1]})).status,201);
  assert.equal((await upload({title:'للمعلم فقط',visibility:'teacher'})).status,201);
  assert.equal((await upload({title:'بلا هدف',visibility:'private',targetStudentIds:[]})).status,400);
  const titles=async(id)=>(await call(libraryFiles,{query:{role:'student',studentId:id,invite:invites[id]}})).body.files.map(file=>file.title).sort();
  assert.deepEqual(await titles(s1),['لطالب واحد','للجميع']);assert.deepEqual(await titles(s2),['للجميع']);
  assert.equal((await call(libraryFiles,{query:{role:'teacher'},cookie:teacher})).body.files.length,3);
  assert.equal((await call(libraryFiles,{query:{role:'teacher'}})).status,401);
});

let failed=0;
for(const [name,fn] of checks){
  try{await fn();console.log(`ok   ${name}`)}
  catch(error){failed+=1;console.error(`FAIL ${name}\n     ${String(error?.stack||error).split('\n').slice(0,4).join('\n     ')}`)}
}
if(failed){console.error(`staging journeys: ${failed} of ${checks.length} failed`);process.exit(1)}
console.log(`Staging journeys regression passed (${checks.length}/${checks.length}).`);
