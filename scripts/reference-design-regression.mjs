// Static guard for the new teacher/student pages (reference design) and their permissions wiring.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,readdirSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const index=read('index.html'),legacy=read('legacy.html'),vercel=JSON.parse(read('vercel.json'));
const student=read('src/app/student.tsx'),teacher=read('src/app/teacher.tsx'),kit=read('src/app/kit.tsx'),main=read('src/app/main.tsx'),css=read('src/app/app.src.css');

// Arabic root and a clean entry: the new pages do not load the legacy patch scripts.
assert.ok(/<html lang="ar" dir="rtl">/.test(index),'the root is Arabic and right-to-left');
assert.ok(index.includes('/src/app/main.tsx')&&!index.includes('student-style-patch')&&!index.includes('/src/main.tsx'),'index.html is the new app only');
assert.ok(legacy.indexOf('/teacher-gate.js')>0&&legacy.indexOf('/teacher-gate.js')<legacy.indexOf('/student-bootstrap.js'),'legacy teacher tools load the teacher gate first');
assert.ok(read('public/teacher-gate.js').includes("action=session")&&read('public/teacher-gate.js').includes("location.replace('/teacher')"));
const rewrite=source=>vercel.rewrites.find(rule=>rule.source===source)?.destination;
for(const source of ['/teacher/student/:id','/teacher/students','/teacher/library','/teacher/settings','/teacher/announcements','/teacher/followup','/teacher/messages','/teacher/stars'])assert.equal(rewrite(source),'/legacy.html',`${source} keeps the existing teacher tool`);
assert.equal(vercel.rewrites.at(-1).source,'/(.*)');assert.equal(vercel.rewrites.at(-1).destination,'/index.html');
assert.ok(read('vite.config.ts').includes("legacy: 'legacy.html'"),'both pages are built');

// Reference order: header, weekly plan, assessment, homework, stars, bottom bar.
const order=['tone="plan"','tone="assessment"','tone="homework"','tone="stars"'].map(token=>student.indexOf(token));
assert.ok(order.every(position=>position>0)&&order.every((position,i)=>i===0||position>order[i-1]),'student cards keep the reference order');
const teacherOrder=['tone="plan"','tone="assessment"','tone="homework"','tone="stars"'].map(token=>teacher.indexOf(token));
assert.ok(teacherOrder.every((position,i)=>position>0&&(i===0||position>teacherOrder[i-1])),'teacher cards use the same identity and order');
const navLabels=[...student.matchAll(/\{key:'(home|weeks|stars|me)',label:'([^']+)'/g)].map(match=>match[2]);
assert.deepEqual(navLabels,['الرئيسية','الفصول','النجوم','حسابي'],'student bar from the right: الرئيسية — الفصول — النجوم — حسابي');
assert.ok(kit.includes("SUBJECT_ORDER:SubjectKey[]=['arabic','quran','islamic','spelling']"),'subjects from the right: لغتي — القرآن الكريم — الدراسات الإسلامية — الإملاء والخط');
for(const tone of ['plan','assessment','homework','stars'])assert.ok(css.includes(`.tkCard.${tone}{`),`${tone} card colour`);
assert.ok(css.includes('--blue-card')&&css.includes('--green-card')&&css.includes('--orange-card')&&css.includes('--purple-card'));
assert.ok(css.includes("font-family:'Readex Pro'")&&existsSync('src/app/assets/ReadexPro-ar.ttf')&&existsSync('src/app/assets/ReadexPro-OFL.txt'),'the Arabic font is self-hosted with its licence');
for(const asset of ['boy','icon-plan','icon-assessment','icon-homework','icon-stars','gift','subject-arabic','subject-quran','subject-islamic','subject-spelling','shakabumbo'])assert.ok(existsSync(`src/app/assets/${asset}.webp`),`${asset} asset`);
execFileSync(process.execPath,['scripts/build-app-css.mjs','--check'],{stdio:'pipe'});

// Quick assessment wording and states.
for(const text of ['أتقن بقية الطلاب','أتقن جميع الطلاب','تراجع عن آخر عملية','المتابعة المركزة'])assert.ok(teacher.includes(text),`teacher screen has «${text}»`);
assert.ok(kit.includes("mastered:'أتقن',needs_repeat:'يحتاج إعادة',not_mastered:'لم يتقن'")&&kit.includes('لم يُقيّم بعد'),'the three approved results plus "not assessed yet"');
assert.ok(!student.includes('تلاوة')&&!teacher.includes('تلاوة'),'Quran follow-up is memorisation only');

// Privacy and data rules.
assert.ok(!student.includes('المتابعة المركزة')&&!student.includes('focused')&&!student.includes('assessmentGroup'),'the focused list never reaches the student page');
const studentHome=read('server/student-home.js');
assert.ok(!studentHome.includes('assessmentGroup')&&!studentHome.includes('focusBySubject'),'the student payload carries no grouping');
for(const file of ['student.tsx','teacher.tsx','kit.tsx','main.tsx'])assert.ok(!/localStorage|sessionStorage/.test(read(`src/app/${file}`)),`${file}: no browser storage as a data source`);
assert.ok(kit.includes("'offline'|'nobackend'|'unauthorized'|'forbidden'|'notfound'")&&kit.includes('CardsSkeleton'),'loading, no data, connection failure and no permission are separate states');
assert.ok(teacher.includes('TEACHER_CODE_INVALID')&&teacher.includes('TEACHER_GATE_NOT_CONFIGURED')&&teacher.includes('TEACHER_LOGIN_LOCKED')&&!teacher.includes('تعذر التحقق من رمز المعلم'),'sign-in failures are reported precisely');

// Permissions are enforced on the server for every data endpoint; the project stays within 12 functions.
const apiFiles=readdirSync('api').filter(name=>name.endsWith('.js'));
assert.equal(apiFiles.length,12,'the deployment allows 12 functions');
for(const name of ['learning-automation','student-state','homework-complete','star-adjust','student-evaluation','teacher-portfolio','library-files','remediation-suggestions'])assert.ok(read(`api/${name}.js`).includes("from '../server/access.js'"),`${name} checks access`);
const access=read('server/access.js');
assert.ok(access.includes('HttpOnly')&&access.includes('timingSafeEqual')&&access.includes('scryptSync')&&access.includes('TEACHER_LOGIN_LOCKED'));
assert.ok(!/STAGING_CODE=\{[^}]*code:/.test(access),'only a digest of the staging code is stored');
const roster=read('server/class-roster.js');
assert.ok(roster.includes("WORKSPACE_ID=IS_PRODUCTION?PRODUCTION_WORKSPACE_ID:STAGING_WORKSPACE_ID"),'Staging and Production use different workspaces');
assert.ok(main.includes('<StudentApp/>')&&main.includes('<TeacherApp'));

console.log('Reference design, wiring and permission regression checks passed.');
