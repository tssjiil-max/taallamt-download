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
for(const asset of ['boy','icon-plan','icon-assessment','icon-homework','gift','shak-arabic','shak-quran','shak-islamic','shak-spelling','shak-star','shak-logo','shak-sourati','shak-trophy','shak-standing'])assert.ok(existsSync(`src/app/assets/${asset}.webp`),`${asset} asset`);
execFileSync(process.execPath,['scripts/build-app-css.mjs','--check'],{stdio:'pipe'});

// Teacher header: identity card, day strip in Saudi time, four live summary tiles, credit at the bottom.
for(const text of ['عدد الطلاب','يحتاجون متابعة','تم تقييمهم اليوم','رسائل جديدة','معًا نصنع جيلًا أفضل','برمجة: سلطان الصاعدي'])assert.ok(teacher.includes(text),`teacher header has «${text}»`);
assert.ok(teacher.includes('hijriDate(now)')&&teacher.includes('gregorianDate(now)')&&kit.includes("timeZone:'Asia/Riyadh'")&&kit.includes('islamic-umalqura'),'dates follow Saudi time and update by themselves');
assert.ok(teacher.includes('summary.students')&&teacher.includes('summary.focused')&&teacher.includes('summary.assessedToday')&&teacher.includes('summary.messages'),'summary numbers come from the server');
assert.ok(css.includes('.tkStats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'),'summary tiles: two per row on a phone');
// Student profile card inside حسابي.
for(const text of ['هواياتي','أهدافي','إنجازاتي','مهاراتي','اسم الطالب:','الصف:'])assert.ok(student.includes(text),`student profile has «${text}»`);
assert.ok(existsSync('src/app/assets/shak-sourati.webp')&&student.includes('SHAK.sourati')&&student.includes("action:'student_profile'"),'the original Shakabumbo picture is the default, and the student saves his own profile');

// Quick assessment wording and states.
for(const text of ['أتقن بقية الطلاب','أتقن الكل مع المتابعة المركزة','تراجع عن آخر عملية','المتابعة المركزة'])assert.ok(teacher.includes(text),`teacher screen has «${text}»`);
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


// ----- unified identity, 7 Oct 2026 -----
// Weekly plan: Hijri and Gregorian together, on both sites, on the card and in the details.
assert.ok(kit.includes('export function PlanDates')&&kit.includes('hijriRange(plan.range)')&&kit.includes('gregorianRange(plan.range)')&&kit.includes("<th scope=\"col\">هجري</th><th scope=\"col\">ميلادي</th>"),'the plan block shows both calendars');
for(const [name,source] of [['student',student],['teacher',teacher]]){
  assert.ok(source.includes('dates={[hijriRange(plan.range),gregorianRange(plan.range)]}'),`${name}: the plan card carries both dates`);
  assert.ok(source.includes('<PlanDates plan='),`${name}: the plan page carries both dates`);
}
// Student rows: large names, pastel cards in turn, a written focus badge, 44px touch targets, file and assessment apart.
assert.ok(css.includes('.tkStName{flex:1;min-width:0;font-size:clamp(20px,21u,22px)')&&!/\.tkStName\{[^}]*(ellipsis|nowrap)/.test(css),'student names are 20–22px and never truncated');
for(const tone of ['c0','c1','c2','c3'])assert.ok(css.includes(`.tkSt.${tone}{`),`row colour ${tone}`);
assert.ok(teacher.includes('className={`tkSt c${index%4}`} data-focus=')&&teacher.includes('<span className="tkBadge focus">المتابعة المركزة</span>'),'colour cycles by position; the focus state is a written badge');
assert.ok(css.includes('.tkAct{flex:1 1 auto;display:inline-grid;place-items:center;min-height:max(44px,38u);min-width:max(44px,38u)'),'row actions are at least 44px');
for(const page of ['function StudentsPage','function FollowupPage','function TodayPage']){const body=teacher.slice(teacher.indexOf(page),teacher.indexOf('\nfunction ',teacher.indexOf(page)+10));assert.ok(body.includes('<StudentCard')&&body.includes('ملف الطالب')&&body.includes('تقييم'),`${page}: big rows with separate file and assessment actions`)}
assert.ok(teacher.includes('طلاب المتابعة المركزة مستثنون، ولا تتغير أي نتيجة سُجّلت سابقًا')&&teacher.includes('role="alertdialog"'),'the bulk buttons state their scope; «أتقن الكل» needs a confirmation');
// Original Shakabumbo artwork: originals kept, derived copies separate, pictures never stretched.
for(const file of ['01-sourati-star.jpg','02-lughati-pencil.jpg','03-shield-logo.jpg','04-standing-white-hair-star.png','05-najm-alyawm-white-hair.jpg','06-najm-alyawm-orange-hair.jpg','07-quran.jpg','08-islamic.jpg','09-spelling.jpg'])assert.ok(existsSync(`design/shakabumbo/originals/${file}`),`original kept: ${file}`);
for(const file of ['standing-orange.png','standing-trophy.png'])assert.ok(existsSync(`design/shakabumbo/derived/${file}`),`derived copy: ${file}`);
assert.ok(kit.includes("arabic:shakArabic,quran:shakQuran,islamic:shakIslamic,spelling:shakSpelling")&&kit.includes('stars:shakStar'),'each subject uses its own original picture; the stars section uses «نجم اليوم»');
assert.ok(css.includes('.tkSubjectImg img{display:block;width:100%;height:100%;object-fit:contain}')&&css.includes('.tkTrophy img{display:block;width:auto;height:208u;max-width:100%;object-fit:contain}'),'pictures keep their proportions');
assert.ok(student.includes('<section className="tkTrophy"')&&student.indexOf('tkTrophy')>student.indexOf('tkStarGrid')&&!/\.tkTrophy[^}]*position:(fixed|sticky)/.test(css),'Shakabumbo with the trophy sits below the stars content, in the page flow');
// Messaging: real conversation stored on the server; the old "no inbox" note is gone.
assert.ok(!teacher.includes('لا يوجد في النظام بريد وارد')&&student.includes('التواصل مع المعلم')&&student.includes("action:'message_send'")&&teacher.includes("post('message_reply'"),'both sites send through the server');
const messages=read('server/messages.js');
assert.ok(messages.includes("collection(db).doc(id)")&&messages.includes('runTransaction')&&!/req\.|body\.from|body\?\.from/.test(messages),'messages are stored in the database; the sender never comes from the request body');
assert.ok(read('api/student-state.js').includes("await requireGuardianLink(req,studentId,body)")&&access.includes('export async function requireGuardianLink'),'a guardian message needs the student\'s own link');
// Assistant: keys only on the server, the chosen provider only, never a simulated answer.
const assistant=read('server/assistant.js');
for(const file of ['student.tsx','teacher.tsx','kit.tsx','main.tsx'])assert.ok(!/sk-[A-Za-z0-9]{8}|AIza[A-Za-z0-9_-]{8}|api\.openai\.com|generativelanguage/.test(read(`src/app/${file}`)),`${file}: no provider key or provider address in the page`);
assert.ok(assistant.includes("keyEnv:'OPENAI_API_KEY'")&&assistant.includes("keyEnv:'GEMINI_API_KEY'")&&assistant.includes('https://api.openai.com/v1/responses')&&assistant.includes(':generateContent')&&assistant.includes("'x-goog-api-key':key"),'official server-side APIs, keys from the environment');
assert.ok(assistant.includes("throw new AssistantError('ASSISTANT_NOT_CONFIGURED',503")&&!/console\.(log|error|warn)/.test(assistant),'no key → «غير مفعّل»; nothing is logged');
assert.ok(teacher.includes('شكابمبو — مساعد المعلم')&&teacher.includes('نسخ الطلب وفتح')&&teacher.includes('اسأل عن هذا الدرس')&&!teacher.includes("action:'assistant_ask'"),'assistant panel: lesson-scoped copy and external chat without API requests');
for(const label of ['اشرح درس هذا الأسبوع','بسّط الفكرة لطالب','اقترح نشاطًا','جهّز تدريب نسخ وإملاء','أنشئ أسئلة تقييم','اسأل سؤالًا عامًا'])assert.ok(assistant.includes(label),`quick action «${label}»`);
assert.equal(vercel.functions?.['api/learning-automation.js']?.maxDuration,60,'the assistant request has room to finish');
// Older teacher tools share the same identity and lose the oversized mascot.
const unified=read('public/unified-identity.css');
assert.ok(legacy.includes('/unified-identity.css')&&legacy.indexOf('/unified-identity.css')>legacy.indexOf('/student-teacher-link.css')&&legacy.includes('/unified-identity.js'),'the unified stylesheet loads last on the older tools');
assert.ok(unified.includes('html body .bottomNav.teacherNav,html body .mascotNav{display:none!important}')&&unified.includes('html body .taNativeAction{display:grid!important')&&read('public/unified-identity.js').includes('/teacher#assistant'),'old bar replaced; «رفع ملف» and «ملف إنجاز المعلم» are buttons');
assert.ok(teacher.includes("{key:'library',label:'الكتب',icon:<NavBook/>,onClick:()=>go('library')}")&&teacher.includes('ملف إنجاز المعلم')&&teacher.includes("['public','جميع الطلاب'],['private','طالب أو مجموعة'],['teacher','المعلم فقط']"),'the library opens inside the new pages with the three sharing options');

console.log('Reference design, wiring and permission regression checks passed.');
