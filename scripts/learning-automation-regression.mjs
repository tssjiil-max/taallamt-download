import {existsSync,readFileSync} from 'node:fs';
import {contentForWeek,quranForDay,weekNumberForDate,riyadhWeekday} from '../server/learning-content.js';

const week3=contentForWeek(3);
const september16=new Date('2026-09-16T08:00:00Z');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
const index=readFileSync('index.html','utf8');
const library=readFileSync('public/teacher-library-automation.js','utf8');
const libraryDelegation=readFileSync('public/teacher-library-delegation.js','utf8');
const nativeLibrary=existsSync('public/teacher-library-native.js')?readFileSync('public/teacher-library-native.js','utf8'):'';
const student=readFileSync('public/student-learning-automation.js','utf8');
const forms=readFileSync('public/teacher-action-forms.js','utf8');

const checks=[
  ['16 Sep 2026 resolves to curriculum week 3',weekNumberForDate(september16)===3],
  ['week 3 spelling is the solar lam skill',week3.spelling.skill==='اللام الشمسية'],
  ['week 3 Arabic remains unit أقاربي / صلة الرحم',week3.arabic.unit==='أقاربي'&&week3.arabic.lesson==='صلة الرحم'],
  ['week 3 Quran distribution has verified Sunday segment',quranForDay(3,0)?.lesson==='الآيات 1 - 6'],
  ['Wednesday is not silently treated as a Quran distribution day',riyadhWeekday(september16)===3&&quranForDay(3,3)===null],
  ['daily cron is 10:00 UTC = 13:00 Asia/Riyadh Sunday-Thursday',vercel.crons?.some(x=>x.path==='/api/cron-daily'&&x.schedule==='0 10 * * 0-4')],
  ['weekly automation runs Saturday morning',vercel.crons?.some(x=>x.path==='/api/cron-weekly'&&x.schedule==='0 5 * * 6')],
  ['teacher action forms and student automation remain loaded',index.includes('/teacher-action-forms.js')&&index.includes('/student-learning-automation.js')],
  ['native library script is loaded as a classic script',index.includes('<script src="/teacher-library-native.js"></script>')&&!index.includes('type="module" src="/teacher-library-native.js"')],
  ['native library converts cards to real href navigation',nativeLibrary.includes('replaceWith(link)')&&nativeLibrary.includes('/teacher/library?section=')],
  ['native library supports all seven sections', ['books','worksheets','remediation','weekly','assessments','spelling','general'].every(key=>nativeLibrary.includes(`'${key}'`))],
  ['native library preserves upload and public/private/teacher access',nativeLibrary.includes('/api/library-files')&&nativeLibrary.includes('public')&&nativeLibrary.includes('private')&&nativeLibrary.includes('teacher')],
  ['teacher portfolio remains available from the native library',nativeLibrary.includes('/api/teacher-portfolio')&&nativeLibrary.includes('ملف إنجاز المعلم')],
  ['student weekly plan is hydrated from learning automation',student.includes('/api/learning-automation?action=preview')&&student.includes('خطتي لهذا الأسبوع')],
  ['teacher student actions no longer need browser prompt',!forms.includes('window.prompt')&&!forms.includes('prompt(')&&forms.includes('/api/student-state')],
  ['legacy delegated library files stay available only as rollback references',library.includes('/api/teacher-portfolio')&&libraryDelegation.includes('.libraryCard')],
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error('Learning automation regression checks failed:');for(const [name] of failed)console.error(`- ${name}`);process.exit(1)}
console.log(`Learning automation regression checks passed (${checks.length}/${checks.length}).`);
