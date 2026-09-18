import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const mustExist=[
  'public/student-live-feed.js',
  'public/teacher-announcement-live-sync.js',
  'public/student-homework-autograde.js',
  'public/student-automation-bridge.js',
  'public/student-teacher-evaluation.js',
  'public/student-style-patch.js',
  'src/main.tsx',
  'index.html'
];
for(const path of mustExist)assert.equal(existsSync(path),true,`missing ${path}`);

const evaluation=readFileSync('public/student-teacher-evaluation.js','utf8');
const homework=readFileSync('public/student-automation-bridge.js','utf8');
const autograde=readFileSync('public/student-homework-autograde.js','utf8');
const feed=readFileSync('public/student-live-feed.js','utf8');
const studentState=readFileSync('api/student-state.js','utf8');
const announceSync=readFileSync('public/teacher-announcement-live-sync.js','utf8');
const stylePatch=readFileSync('public/student-style-patch.js','utf8');
const main=readFileSync('src/main.tsx','utf8');
const index=readFileSync('index.html','utf8');

assert.equal(evaluation.includes("heading.textContent='تقييمي اليوم'"),true);
assert.equal(evaluation.includes("academicTitle.textContent='التقييم الأكاديمي'"),true);
assert.equal(evaluation.includes("behaviorTitle.textContent='السلوك العام'"),true);
assert.equal(evaluation.includes("assessmentIsToday"),true);
assert.equal(evaluation.includes("todayAcademicMap"),true);
assert.equal(evaluation.includes("todayBehaviorCounts"),true);
assert.equal(evaluation.includes("day.insertBefore(taskPanel"),false,'locked card order must not be rearranged');

assert.equal(homework.includes("الواجبات اليومية"),true);
assert.equal(homework.includes("automationTask"),true);
assert.equal(homework.includes("button.dataset.autoGrade=task.autoGrading?.enabled?'1':'0'"),true);

assert.equal(autograde.includes(".student .automationTask[data-auto-grade=\"1\"]"),true);
assert.equal(autograde.includes("void refresh().then(open)"),true,'autograde must wait for state before opening');
assert.equal(autograde.includes('/api/homework-complete'),true);

assert.equal(feed.includes('ملاحظات المعلم'),true);
assert.equal(feed.includes('الإعلانات'),true);
assert.equal(feed.includes('/api/student-state?studentId='),true);
assert.equal(feed.includes("setInterval(syncLiveState,12000)"),true);

assert.equal(studentState.includes("announcementVisibleToStudent"),true);
assert.equal(studentState.includes("action||'')==='announcement'"),true);
assert.equal(studentState.includes("targetType==='student'"),true);
assert.equal(studentState.includes("targetType==='students'"),true);
assert.equal(studentState.includes("item.status!=='published'"),true);
assert.equal(announceSync.includes("location.pathname.startsWith('/teacher')"),true);
assert.equal(announceSync.includes("fetch('/api/student-state'"),true);
assert.equal(existsSync('api/teacher-announcements.js'),false,'announcement sync must reuse student-state to avoid a new Vercel function');
assert.equal(announceSync.includes("targetType:item?.targetType==='student'?'student':'class'"),true);
assert.equal(main.includes('<option value="class">الفصل كامل</option>'),true);
assert.equal(main.includes('<option value="student">طالب محدد</option>'),true);
assert.equal(main.includes("targetType:a.targetType||'class'"),true);
assert.equal(main.includes("لا توجد إعلانات منشورة"),true);
assert.equal(main.includes("اجتماع أولياء الأمور يوم الأحد"),false,'teacher home must not contain a fabricated default announcement');

assert.equal(stylePatch.includes("const SHAKABUMBO_PROFILE='/student-shakabumbo-shield.svg';"),true);
assert.equal(stylePatch.includes("const SHAKABUMBO_NAV='/student-assets/student-center-logo.svg';"),true);
assert.equal(index.includes('/student-live-feed.js'),true);
assert.equal(index.includes('/teacher-announcement-live-sync.js'),true);

assert.equal(existsSync('public/student-live-sync.css'),false,'student live-sync work must not add a new CSS layer');
assert.equal(existsSync('public/student-redesign-safe-v1.css'),false,'locked visual redesign CSS must not enter the functional branch');

console.log('Student live-sync regression checks passed.');
