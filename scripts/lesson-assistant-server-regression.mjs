import {existsSync,readFileSync} from 'node:fs';

const read=path=>existsSync(path)?readFileSync(path,'utf8'):'';
const api=read('api/learning-automation.js');
const assistant=read('server/lesson-assistant-ai.js');
const vercel=read('vercel.json');
const pkg=JSON.parse(read('package.json')||'{}');

const checks=[
 ['assistant stays inside existing learning automation function',api.includes("action==='assistant'")&&api.includes('runLessonAssistant')],
 ['assistant implementation uses runtime-safe dynamic AI SDK import',assistant.includes("import('ai')")&&assistant.includes('generateText')],
 ['assistant is bounded to current lesson context',assistant.includes('LESSON_CONTEXT_REQUIRED')&&assistant.includes('لا تخمّن')&&assistant.includes('خارج سياق درس اليوم')],
 ['assistant has no student or guardian writes',!assistant.includes('adminDb')&&!assistant.includes('studentProfiles/')&&!assistant.includes('assessments/')&&!assistant.includes('communications/')],
 ['assistant URL rewrites to learning automation action',vercel.includes('/api/lesson-assistant')&&vercel.includes('/api/learning-automation?action=assistant')],
 ['AI SDK dependency is present',Boolean(pkg.dependencies?.ai)],
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){console.error('Lesson assistant server regression failed:');for(const [name] of failed)console.error(`- ${name}`);process.exit(1)}
console.log(`Lesson assistant server regression passed (${checks.length}/${checks.length}).`);
