import {existsSync,readFileSync} from 'node:fs';
import {contentForWeek,quranForDay,weekNumberForDate,riyadhWeekday} from '../server/learning-content.js';

const week3=contentForWeek(3);
const september16=new Date('2026-09-16T08:00:00Z');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
const index=readFileSync('index.html','utf8');
const library=readFileSync('public/teacher-library-automation.js','utf8');
const libraryDelegation=readFileSync('public/teacher-library-delegation.js','utf8');
const nativeLibrary=existsSync('public/teacher-library-native.js')?readFileSync('public/teacher-library-native.js','utf8'):'';
const professionalPortfolio=existsSync('public/teacher-portfolio-professional.js')?readFileSync('public/teacher-portfolio-professional.js','utf8'):'';
const portfolioApi=readFileSync('api/teacher-portfolio.js','utf8');
const student=readFileSync('public/student-learning-automation.js','utf8');
const bridge=existsSync('public/student-automation-bridge.js')?readFileSync('public/student-automation-bridge.js','utf8'):'';
const automationApi=readFileSync('api/learning-automation.js','utf8');
const forms=readFileSync('public/teacher-action-forms.js','utf8');

const professionalSections=['الهوية المهنية','الأهداف المهنية','التخطيط للتعلم','تنفيذ التدريس والأنشطة','التقويم ونواتج التعلم','الفروق الفردية والخطط العلاجية','التواصل مع الأسرة','التحفيز والإنجاز','التطوير المهني والمجتمع المهني','المبادرات والمشروعات','ملخص الأثر'];

const checks=[
  ['16 Sep 2026 resolves to curriculum week 3',weekNumberForDate(september16)===3],
  ['week 3 spelling is the solar lam skill',week3.spelling.skill==='اللام الشمسية'],
  ['week 3 Arabic remains unit أقاربي / صلة الرحم',week3.arabic.unit==='أقاربي'&&week3.arabic.lesson==='صلة الرحم'],
  ['week 3 Quran distribution has verified Sunday segment',quranForDay(3,0)?.lesson==='الآيات 1 - 6'],
  ['Wednesday is not silently treated as a Quran distribution day',riyadhWeekday(september16)===3&&quranForDay(3,3)===null],
  ['daily cron runs before school at 05:00 Asia/Riyadh Sunday-Thursday',vercel.crons?.some(x=>x.path==='/api/cron-daily'&&x.schedule==='0 2 * * 0-4')],
  ['weekly automation runs Saturday morning',vercel.crons?.some(x=>x.path==='/api/cron-weekly'&&x.schedule==='0 5 * * 6')],
  ['teacher action forms and student automation remain loaded',index.includes('/teacher-action-forms.js')&&index.includes('/student-learning-automation.js')],
  ['student automation bridge is loaded after existing student automation',index.includes('/student-automation-bridge.js')&&index.indexOf('/student-automation-bridge.js')>index.indexOf('/student-learning-automation.js')],
  ['automation preview exposes deterministic homework ids and target ids',automationApi.includes('`auto-homework:${localDate}:${subject}`')&&automationApi.includes('targetIds:[targetId(subject,week)]')&&automationApi.includes('scheduledDate:localDate')],
  ['automation preview survives timetable read failure with verified fallback',automationApi.includes('fallbackSchedule')&&automationApi.includes('catch')&&automationApi.includes('scheduleSource')],
  ['fallback follows accepted Tuesday timetable: Lughaty + Quran',automationApi.includes("2:['arabic','quran']")],
  ['fallback follows accepted Wednesday timetable: Lughaty + Islamic',automationApi.includes("3:['arabic','islamic']")],
  ['fallback reserves Thursday Lughaty umbrella for spelling/handwriting work',automationApi.includes("4:['spelling']")],
  ['Quran automation distinguishes memorization or review work',automationApi.includes("taskType:'quran'")||automationApi.includes("taskType:subject==='quran'")],
  ['student bridge reads both automation preview and student state',bridge.includes('/api/learning-automation?action=preview')&&bridge.includes('/api/student-state?studentId=')],
  ['student bridge replaces static task rows only for a selected student',bridge.includes("const id=studentId();if(!id)return false")&&bridge.includes("panel.querySelectorAll('.taskItem,.automationTaskEmpty')")&&bridge.includes('مهامي اليوم')],
  ['student bridge filters today tasks by Saudi automation date',bridge.includes('scheduledDate')&&bridge.includes('preview.localDate')],
  ['student bridge merges materialized and preview tasks by deterministic id',bridge.includes('materialized')&&bridge.includes('preview.homework')&&bridge.includes('new Map')],
  ['materialized student tasks remain completable through existing endpoint',bridge.includes('/api/homework-complete')&&bridge.includes('homeworkId')],
  ['subject modal receives current distribution and today assignment context',bridge.includes('studentPatchModal')&&bridge.includes('subjectMap')&&bridge.includes('targetIds')&&bridge.includes('تكليف اليوم')],
  ['native library script is loaded as a classic script',index.includes('<script src="/teacher-library-native.js"></script>')&&!index.includes('type="module" src="/teacher-library-native.js"')],
  ['native library converts cards to real href navigation',nativeLibrary.includes('replaceWith(link)')&&nativeLibrary.includes('/teacher/library?section=')],
  ['native library supports all seven sections', ['books','worksheets','remediation','weekly','assessments','spelling','general'].every(key=>nativeLibrary.includes(`'${key}'`))],
  ['native library preserves upload and public/private/teacher access',nativeLibrary.includes('/api/library-files')&&nativeLibrary.includes('public')&&nativeLibrary.includes('private')&&nativeLibrary.includes('teacher')],
  ['native library never owns or fetches portfolio data',nativeLibrary.includes("container.dataset.professionalPortfolioHost='1'")&&!nativeLibrary.includes('/api/teacher-portfolio')&&!nativeLibrary.includes('renderPortfolio(')],
  ['professional portfolio can render without Firestore using cache/fallback',professionalPortfolio.includes('fallbackData')&&professionalPortfolio.includes('readCache')&&professionalPortfolio.includes('waitForContainer')],
  ['professional portfolio is loaded after native library navigation',index.includes('<script src="/teacher-portfolio-professional.js"></script>')&&index.includes('/teacher-portfolio-professional.css')],
  ['professional portfolio has the agreed structured sections',professionalSections.every(section=>portfolioApi.includes(section)&&professionalPortfolio.includes(section))],
  ['professional portfolio calculates learning impact metrics from live system data',portfolioApi.includes('masteryRate')&&portfolioApi.includes('studentsAssessed')&&portfolioApi.includes('remediationResolvedRate')&&portfolioApi.includes('impactSummary')],
  ['professional portfolio generates measurable professional goals',portfolioApi.includes('professionalGoals')&&portfolioApi.includes('target')&&portfolioApi.includes('current')],
  ['portfolio accepts phone evidence into a selected professional section',professionalPortfolio.includes('portfolioSection')&&professionalPortfolio.includes("category:'teacher-portfolio'")&&professionalPortfolio.includes('إضافة شاهد من الجوال')],
  ['portfolio keeps manually uploaded evidence teacher-only',professionalPortfolio.includes("visibility:'teacher'")&&professionalPortfolio.includes('يبقى شاهد ملف الإنجاز خاصًا بالمعلم')],
  ['portfolio supports print/download and share actions',professionalPortfolio.includes('تحميل نسخة')&&professionalPortfolio.includes('navigator.share')&&professionalPortfolio.includes('window.print')],
  ['portfolio compresses large phone images before upload',professionalPortfolio.includes('canvas.toBlob')&&professionalPortfolio.includes('1600')],
  ['student weekly plan is hydrated from learning automation',student.includes('/api/learning-automation?action=preview')&&student.includes('خطتي لهذا الأسبوع')],
  ['teacher student actions no longer need browser prompt',!forms.includes('window.prompt')&&!forms.includes('prompt(')&&forms.includes('/api/student-state')],
  ['legacy delegated library files stay available only as rollback references',library.includes('/api/teacher-portfolio')&&libraryDelegation.includes('.libraryCard')],
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error('Learning automation regression checks failed:');for(const [name] of failed)console.error(`- ${name}`);process.exit(1)}
console.log(`Learning automation regression checks passed (${checks.length}/${checks.length}).`);
