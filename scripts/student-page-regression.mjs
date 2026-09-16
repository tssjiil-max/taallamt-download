import {readFileSync} from 'node:fs';

const css=readFileSync('public/student-profile-refine.css','utf8');
const patch=readFileSync('public/student-style-patch.js','utf8');
const interactions=readFileSync('public/student-interactions.js','utf8');

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
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Student page regression checks failed:');
  for(const [name] of failed)console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Student page regression checks passed (${checks.length}/${checks.length}).`);
