import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-profile-refine.css','utf8');
const patch=readFileSync('public/student-style-patch.js','utf8');
const interactions=readFileSync('public/student-interactions.js','utf8');
const settingsNav=readFileSync('public/student-settings-navigation-fix.js','utf8');
const teacherStudents=readFileSync('public/teacher-students-patch.js','utf8');
const studentSync=readFileSync('src/student-sync.ts','utf8');
const studentState=readFileSync('api/student-state.js','utf8');
const indexHtml=readFileSync('index.html','utf8');

const checks=[
  ['subject grid can shrink',css.includes('grid-template-columns:repeat(4,minmax(0,1fr))')],
  ['subject cards have min-width zero',css.includes('.student .studentSubject{min-width:0')],
  ['subject mascot cannot overflow its card',css.includes('.student .studentSubject .studentSubjectMascot{max-width:100%')],
  ['hobbies panel exists',patch.includes("if(kind==='hobbies')")],
  ['goals panel exists',patch.includes("if(kind==='goals')")],
  ['achievements panel exists',patch.includes("if(kind==='achievements')")],
  ['skills panel exists',patch.includes("if(kind==='skills')")],
  ['settings panel exists',patch.includes("if(kind==='settings')")],
  ['info cards are bound to actions',patch.includes('bindStudentInfoCards')],
  ['More menu has no placeholder fallback',!patch.includes("label==='صورتي'?openStudentPanel('photo'):toast('لا توجد بيانات متاحة حاليًا')")],
  ['live interactions do not hijack More',!interactions.includes("if(text!=='المزيد')return")],
  ['live interactions do not hijack subject cards',!interactions.includes("const subject=target.closest('.studentSubject')")],
  ['teacher More is not hijacked by student sync',!studentSync.includes("title==='شكابمبو'||title==='المزيد'")],
  ['followup group has bulk master action',teacherStudents.includes('data-bulk-master-followup')],
  ['bulk master action is restricted to followup group',teacherStudents.includes("if(safe==='followup')")],
  ['bulk master saves a quick assessment per followup student',teacherStudents.includes('bulkMasterFollowup')],
  ['student state exposes curriculum targets',studentState.includes('curriculum:curriculumRows')],
  ['student state exposes published weekly plan',studentState.includes('weeklyPlan:weeklyPlanRows')],
  ['student profile persists hobbies without a new collection',studentState.includes('patch.hobbies=hobbies')],
  ['subject panel explains when teacher has not published subject work',patch.includes('لم ينشر المعلم مهارة أو واجبًا لهذه المادة لهذا الأسبوع بعد')],
  ['subject panel resolves weekly targets and homework from teacher state',patch.includes('subjectPublishedPlan')&&patch.includes('subjectHomework')],
  ['skills panel resolves curriculum target names',patch.includes('targetTitleMap')&&patch.includes('needs_practice')],
  ['goals are derived from teacher assessments',patch.includes('practiceTargets')&&patch.includes('أحتاج تدريبًا على')],
  ['achievements read portfolio summaries',patch.includes('state?.portfolio')&&patch.includes('.summary')],
  ['hobbies offer selectable child-friendly choices',patch.includes('HOBBY_OPTIONS')&&patch.includes('saveHobbies')],
  ['goals and skills have small top-card icons',css.includes('[data-student-info="goals"] b::before')&&css.includes('[data-student-info="skills"] b::before')],
  ['settings navigation resolves visible student sections',settingsNav.includes("function findStudentSection(kind)")&&settingsNav.includes("kind==='subjects'")&&settingsNav.includes("kind==='tasks'")],
  ['settings navigation scrolls after modal removal',settingsNav.includes('requestAnimationFrame(()=>requestAnimationFrame')&&settingsNav.includes("scrollIntoView({behavior:'smooth',block:'start'})")],
  ['settings material and task buttons are intercepted safely',settingsNav.includes("label==='عرض المواد'?'subjects':label==='مهامي اليوم'?'tasks':null")&&settingsNav.includes('event.stopImmediatePropagation()')],
  ['settings navigation patch is loaded',indexHtml.includes('/student-settings-navigation-fix.js')],
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Student page regression checks failed:');
  for(const [name] of failed)console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Student page regression checks passed (${checks.length}/${checks.length}).`);
