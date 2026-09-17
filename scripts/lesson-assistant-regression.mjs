import {existsSync,readFileSync} from 'node:fs';

const read=(path)=>existsSync(path)?readFileSync(path,'utf8'):'';
const index=read('index.html');
const page=read('src/teacher-lesson-page.tsx');
const css=read('src/teacher-lesson.css');
const planner=read('src/core/lesson-assistant.ts');
const api=read('api/lesson-assistant.js');
const pkg=JSON.parse(read('package.json')||'{}');

const checks=[
  ['lesson route has an isolated page entry',index.includes("location.pathname==='/teacher/lesson'")&&index.includes('/src/teacher-lesson-page.tsx')],
  ['start lesson is intercepted without changing the existing teacher component',index.includes('.startLesson')&&index.includes("location.assign('/teacher/lesson')")],
  ['lesson page reads existing learning automation preview',page.includes('/api/learning-automation?action=preview')],
  ['lesson page exposes teacher controls',page.includes('جهّز الحصة لي')&&page.includes('الاستراتيجية')&&page.includes('إدارة الوقت')],
  ['Shakabombo is an active lesson assistant',page.includes('اسأل شكابمبو')&&page.includes('سؤال طالب')&&page.includes('بسّط')&&page.includes('مثال آخر')],
  ['lesson page posts only bounded lesson context to assistant API',page.includes('/api/lesson-assistant')&&page.includes('subjectLabel')&&page.includes('skill')&&!page.includes('CLASS_STUDENTS')],
  ['planner module exists with subject-aware strategies',planner.includes('strategyOptionsForLesson')&&planner.includes("quran")&&planner.includes("islamic")&&planner.includes("spelling")],
  ['planner builds lesson steps without student writes',planner.includes('buildLessonPlan')&&!planner.includes('assessments/')&&!planner.includes('studentProfiles/')],
  ['assistant API uses Vercel AI SDK',api.includes("from 'ai'")&&api.includes('generateText')],
  ['assistant API uses low-cost classroom model',api.includes("openai/gpt-5.6-luna")],
  ['assistant API is bounded to lesson context',api.includes('خارج سياق درس اليوم')&&api.includes('لا تخمّن')&&api.includes('ثماني سنوات')],
  ['assistant API does not write student or guardian data',!api.includes('adminDb')&&!api.includes('assessments/')&&!api.includes('studentProfiles/')&&!api.includes('communications/')],
  ['AI dependency is installed',Boolean(pkg.dependencies?.ai)],
  ['lesson workspace has dedicated mobile styles',css.includes('.lessonWorkspace')&&css.includes('.shakabomboAssistant')],
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Lesson assistant regression checks failed:');
  for(const [name] of failed)console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Lesson assistant regression checks passed (${checks.length}/${checks.length}).`);
