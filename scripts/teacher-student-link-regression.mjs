import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {buildClassOverview,subjectOfTarget,weekKeyFor} from '../server/class-link.js';
import {CLASS_STUDENTS} from '../server/class-roster.js';
import {riyadhDateString,weekNumberForDate} from '../server/learning-content.js';

// ---------- 1) class read model (pure) ----------
const now=new Date('2026-10-05T07:00:00Z');           // Monday 10:00 in Riyadh, curriculum week 6
const today=riyadhDateString(now),week=weekNumberForDate(now),weekKey=weekKeyFor(week);
assert.equal(today,'2026-10-05');assert.equal(week,6);
const iso=hoursAgo=>new Date(now.getTime()-hoursAgo*3600000).toISOString();
const [a,b,c,d]=CLASS_STUDENTS.map(student=>student.id);

assert.equal(subjectOfTarget('subject:arabic'),'arabic');
assert.equal(subjectOfTarget('auto:quran:w06'),'quran');
assert.equal(subjectOfTarget('subject:spelling_handwriting'),'spelling');
assert.equal(subjectOfTarget('الدراسات الإسلامية'),'islamic');
assert.equal(subjectOfTarget('unknown'),null);

const homework=[
  {id:`auto-homework:${today}:arabic`,title:'لغتي — عذرًا يا جدي',subject:'لغتي',subjectKey:'arabic',scheduledDate:today,assignedAt:iso(5),kind:'homework',source:'automation'},
  {id:'homework_teacher_1',title:'واجب خاص',subject:'واجب',assignedAt:iso(1),kind:'homework'},
  {id:'homework_old',title:'واجب سابق',subject:'واجب',assignedAt:iso(50),kind:'homework'}
];
const evidence=[
  ...CLASS_STUDENTS.map(student=>({id:`${homework[0].id}_${student.id}`,homeworkId:homework[0].id,studentId:student.id,status:student.id===a?'completed':'assigned',assignedAt:iso(5)})),
  {id:'e1',homeworkId:'homework_teacher_1',studentId:a,status:'graded',correct:true,assignedAt:iso(1)},
  {id:'e2',homeworkId:'homework_old',studentId:a,status:'assigned',assignedAt:iso(50)},
  {id:'e3',homeworkId:'homework_old',studentId:b,status:'completed',assignedAt:iso(50)},
  {id:'e4',homeworkId:'homework_missing',studentId:b,status:'assigned',assignedAt:iso(3)}
];
const assessments=[
  {id:'as1',studentId:a,enteredAt:iso(2),academic:[{targetId:'subject:arabic',result:'mastered'},{targetId:'subject:quran',result:'needs_practice'}],behavior:[]},
  {id:'as2',studentId:a,enteredAt:iso(1),academic:[],behavior:[{code:'distinguished',label:'متميز'}]},
  {id:'as3',studentId:b,enteredAt:iso(1),academic:[],behavior:[{code:'needs_followup',label:'يحتاج متابعة'}]},
  {id:'as4',studentId:c,enteredAt:iso(1),academic:['arabic','quran','islamic','spelling_handwriting'].map(key=>({targetId:`subject:${key}`,result:'mastered'})),behavior:[{code:'distinguished',label:'متميز'}]},
  {id:'as5',studentId:d,enteredAt:iso(30),academic:[{targetId:'auto:islamic:w06',result:'not_mastered'}],behavior:[]},
  {id:'as6',studentId:d,enteredAt:iso(40),academic:[{targetId:'subject:islamic',result:'mastered'}],behavior:[{kind:'value',code:'needs_followup',valueName:'الصدق'}]}
];
const communications=[
  {id:'c1',studentId:a,reasonCode:'guardian_message',reason:'رسالة لولي الأمر',summary:'نشكر متابعتكم',createdAt:iso(2)},
  {id:'c2',studentId:a,reasonCode:'followup',reason:'متابعة يومية',summary:'مراجعة الحفظ',createdAt:iso(3)},
  {id:'c3',studentId:b,reasonCode:'guardian_message',reason:'رسالة لولي الأمر',summary:'قديمة',createdAt:iso(24*20)}
];
const remediation=[{id:'r1',studentId:a,targetId:'subject:quran',status:'active'},{id:'r2',studentId:c,targetId:'subject:quran',status:'resolved'}];
const ledgers=[{studentId:a,month:'2026-10',stars:7},{studentId:b,month:'2026-10',stars:99}];
const weeklyPlans=['arabic','quran','islamic','spelling'].map(subject=>({id:`auto-week:${weekKey}:${subject}`,weekKey,subject,lesson:`درس ${subject}`,publishStatus:'published'}));

const overview=buildClassOverview({assessments,homework,evidence,communications,remediation,ledgers,profiles:[{studentId:d,assessmentGroup:'focused'}],weeklyPlans,date:now});
const row=id=>overview.students.find(student=>student.id===id);

assert.equal(overview.localDate,today);assert.equal(overview.week,6);assert.equal(overview.schoolDay,true);
assert.equal(overview.students.length,CLASS_STUDENTS.length);
assert.deepEqual({students:overview.totals.students,assessedToday:overview.totals.assessedToday,notAssessedToday:overview.totals.notAssessedToday},{students:29,assessedToday:3,notAssessedToday:26},'today counts come from Riyadh-day assessments only');
assert.equal(overview.totals.excellentToday,1,'only the fully mastered, well-behaved student is excellent today');
assert.equal(overview.totals.behaviorNotesToday,1);
assert.equal(overview.totals.messages,1,'only guardian messages from the last week count as new');
assert.equal(overview.totals.needsFollowup,3);
assert.deepEqual(row(a).latestAcademic,{arabic:'mastered',quran:'needs_practice'});
assert.ok(row(a).needsFollowup&&row(a).followupReasons.some(text=>text.includes('القرآن الكريم'))&&row(a).followupReasons.some(text=>text.includes('خطة علاجية'))&&row(a).followupReasons.some(text=>text.includes('مراجعة الحفظ')),'follow-up reasons explain why');
assert.ok(row(b).needsFollowup&&row(b).followupReasons[0].includes('سلوك'));
assert.equal(row(c).needsFollowup,false);assert.equal(row(c).excellentToday,true);
assert.equal(row(d).latestAcademic.islamic,'not_mastered','the most recent result wins across weekly and subject-level target ids');
assert.equal(row(d).latestBehavior,null,'value assessments are not behaviour notes');
assert.equal(row(d).group,'focused');
assert.equal(row(a).stars,7);assert.equal(row(b).stars,30,'stars are clamped to the monthly cap');assert.equal(row(c).stars,0);

const auto=overview.homeworkToday.find(item=>item.id===homework[0].id),own=overview.homeworkToday.find(item=>item.id==='homework_teacher_1');
assert.equal(overview.homeworkToday.length,2,'only today\'s homework is listed for today');
assert.deepEqual({assigned:auto.assigned,done:auto.done},{assigned:29,done:1});
assert.deepEqual({assigned:own.assigned,done:own.done},{assigned:1,done:1},'a correct auto-graded answer counts as done');
assert.deepEqual(row(a).homeworkToday,{assigned:2,done:2});
assert.equal(row(a).pendingOlder,1,'unfinished earlier homework is carried as pending');
assert.equal(row(b).pendingOlder,0,'evidence without a known homework is ignored');
assert.equal(overview.totals.pendingOlder,1);
assert.equal(overview.weeklyPlan.published,true);assert.equal(overview.weeklyPlan.items.length,4);
assert.equal(overview.needsEnsure,false);
assert.ok(overview.curriculum.every(item=>item.percent===Math.round(6/18*100)&&item.weeks===18));

const empty=buildClassOverview({date:now});
assert.equal(empty.weeklyPlan.published,false);assert.equal(empty.needsEnsure,true,'a missing weekly plan or daily homework asks for the catch-up publish');
assert.ok(empty.weeklyPlan.items.every(item=>item.lesson),'the planned lessons are still shown before publishing');
const friday=buildClassOverview({weeklyPlans,date:new Date('2026-10-09T07:00:00Z')});
assert.equal(friday.schoolDay,false);assert.equal(friday.needsEnsure,false,'weekends never ask for daily homework');

// ---------- 2) wiring ----------
const read=path=>readFileSync(path,'utf8');
const index=read('legacy.html'),automation=read('api/learning-automation.js'),dashboard=read('public/teacher-dashboard-live.js'),bridge=read('public/student-automation-bridge.js');
const evaluation=read('public/student-teacher-evaluation.js'),autograde=read('public/student-homework-autograde.js'),rosterPatch=read('public/teacher-students-patch.js');
const direct=read('public/teacher-direct-panels.js'),preview=read('public/teacher-student-link.js'),sync=read('src/student-sync.ts'),link=read('server/class-link.js');

assert.equal(readdirSync('api').filter(name=>name.endsWith('.js')).length,12,'the link must reuse existing endpoints: the deployment allows 12 functions');
assert.ok(automation.includes("action==='overview'")&&automation.includes("action==='ensure'")&&automation.includes("action==='class_homework'"),'class actions live in the existing automation endpoint');
assert.ok(automation.includes('ensureCurrentLearning')&&automation.includes('previewWriteGuard()'),'catch-up publishing keeps the production write guard');
assert.ok(link.includes(".select('studentId','assessmentGroup')"),'the class read must not download student photos');
for(const file of ['/teacher-dashboard-live.css','/teacher-dashboard-live.js','/teacher-student-link.js','/student-teacher-link.css'])assert.ok(index.includes(file),`${file} must be loaded`);
assert.ok(index.indexOf('/teacher-dashboard-live.js')>index.indexOf('/teacher-interactions.js'),'dashboard link loads after the dashboard interactions');

assert.ok(dashboard.includes('/api/learning-automation?action=overview')&&dashboard.includes("action:'ensure'")&&dashboard.includes("action:'class_homework'"));
assert.ok(dashboard.includes('REFRESH_THROTTLE_MS')&&!dashboard.includes('setInterval('),'the dashboard refreshes on focus with a throttle, never by polling');
assert.ok(dashboard.includes('taallamtEnsureTried:'),'catch-up publishing is attempted at most once per day per session');
assert.ok(dashboard.includes('strong.textContent!==String(value)'),'dashboard writes must be idempotent');
assert.ok(rosterPatch.includes('value.textContent!==next'),'the roster count must not rewrite identical text (it re-triggers its own observer and freezes the page)');
assert.ok(direct.includes('/api/learning-automation?action=overview')&&direct.includes('STUDENTS.map(getState)'),'teacher lists use one class read and keep the per-student fallback');
assert.ok(direct.includes("if(!root.querySelector('#teacherDirectBody'))mount()"),'teacher lists must survive the app shell rendering after them');
assert.ok(preview.includes("action:'access_share'")&&preview.includes('/student?studentId='),'teacher can open the exact student page through the canonical link token');

assert.ok(bridge.includes('carriedTasks')&&bridge.includes('واجب سابق لم يُنجز'),'unfinished homework stays on the student page');
assert.ok(bridge.includes("evidence?.status==='completed'||evidence?.correct===true"),'graded-correct homework counts as done on the student page');
assert.ok(bridge.includes('button.dataset.autoGrade='),'student task rows mark auto-graded homework');
assert.ok(autograde.includes('.automationTask[data-auto-grade="1"]'),'auto-graded homework opens the answer sheet from the automation task rows');
assert.ok(evaluation.includes('resultForTarget')&&evaluation.includes('subjectTargetId'),'teacher subject-level assessments must show against the weekly plan rows');
assert.ok(bridge.includes('targetIds.add(`subject:${'),'subject sheet must count the teacher\'s subject-level assessment');
assert.ok(sync.includes("if(tasks.dataset.automationDate)return;"),'legacy task rows must not duplicate the automation rows');
assert.ok(sync.includes('خطة علاجية جارية'),'active remediation plans reach the student page');
assert.ok(existsSync('public/student-teacher-link.css')&&read('public/student-teacher-link.css').includes('.student>.studentTeacherUpdates{'),'teacher updates sit in the student page flow');

console.log('Teacher/student link regression checks passed.');
