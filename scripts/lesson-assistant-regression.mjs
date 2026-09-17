import {existsSync,readFileSync} from 'node:fs';

const read=(path)=>existsSync(path)?readFileSync(path,'utf8'):'';
const index=read('index.html');
const page=read('src/teacher-lesson-page.tsx');
const css=read('src/teacher-lesson.css');
const shellCss=read('public/teacher-lesson-shell.css');
const planner=read('src/core/lesson-assistant.ts');
const automationApi=read('api/learning-automation.js');
const assistant=read('server/lesson-assistant-ai.js');
const pkg=JSON.parse(read('package.json')||'{}');

const checks=[
  ['lesson page module is appended after the existing app scripts',index.includes('/src/teacher-lesson-page.tsx')&&index.lastIndexOf('/src/teacher-lesson-page.tsx')>index.indexOf('/src/main.tsx')],
  ['lesson shell stylesheet is loaded without replacing existing styles',index.includes('/teacher-lesson-shell.css')],
  ['lesson route is isolated inside its own entry module',page.includes("location.pathname==='/teacher/lesson'")&&page.includes('teacher-lesson-root')],
  ['lesson route hides only the existing React root',shellCss.includes('body.teacherLessonMode #root')&&shellCss.includes('teacher-lesson-root')],
  ['start lesson is intercepted without changing the existing teacher component',page.includes('.startLesson')&&page.includes("location.assign('/teacher/lesson')")],
  ['lesson page reads existing learning automation preview',page.includes('/api/learning-automation?action=preview')],
  ['lesson page exposes teacher controls',page.includes('جهّز الحصة لي')&&page.includes('الاستراتيجية')&&page.includes('إدارة الوقت')],
  ['Shakabombo is an active lesson assistant',page.includes('اسأل شكابمبو')&&page.includes('سؤال طالب')&&page.includes('بسّط')&&page.includes('مثال آخر')],
  ['lesson page reuses learning automation for assistant requests',page.includes('/api/learning-automation?action=assistant')&&page.includes('subjectLabel')&&page.includes('skill')&&!page.includes('CLASS_STUDENTS')],
  ['no extra assistant serverless function remains',!existsSync('api/lesson-assistant.js')],
  ['learning automation exposes assistant action',automationApi.includes("action==='assistant'")&&automationApi.includes('runLessonAssistant')],
  ['planner module exists with subject-aware strategies',planner.includes('strategyOptionsForLesson')&&planner.includes("quran")&&planner.includes("islamic")&&planner.includes("spelling")],
  ['planner builds lesson steps without student writes',planner.includes('buildLessonPlan')&&!planner.includes('assessments/')&&!planner.includes('studentProfiles/')],
  ['assistant module uses Vercel AI SDK',assistant.includes("from 'ai'")&&assistant.includes('generateText')],
  ['assistant module uses low-cost classroom model',assistant.includes("openai/gpt-5.6-luna")],
  ['assistant module uses minimal reasoning for classroom latency',assistant.includes("reasoning:'none'")],
  ['assistant module disallows prompt training through the gateway',assistant.includes('disallowPromptTraining:true')],
  ['assistant module is bounded to lesson context',assistant.includes('خارج سياق درس اليوم')&&assistant.includes('لا تخمّن')&&assistant.includes('ثماني سنوات')],
  ['assistant module has no Firebase or student writes',!assistant.includes('adminDb')&&!assistant.includes('assessments/')&&!assistant.includes('studentProfiles/')&&!assistant.includes('communications/')],
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
