import {existsSync,readFileSync} from 'node:fs';

const approvedNames=[
  'أحمد بسام الأحمد','أسامه سلطان الصاعدي','أمير نايف الحجيلي','أنس أحمد الجهني','أوس نايف الشريف','أويس عادل المالكي','تميم ماجد الحجيلي','ثامر عبدالله العوفي','راكان حاتم الجهني','ريان محمود بري','سلطان فهد الجهني','شامخ بدر الجهني','عادل غالب العنزي','عبدالجليل سالم عبدالجليل','عبدالرحمن نواف الحازمي','عمر حميد العمري','فيصل محمد المطيري','قصي عبدالله الحجيلي','كنان محمد اليوسفي','محمد سماح البوق','محمد صالح عواد','موسى رياض الأحمد','نايف أحمد الجهني','نواف مطلق العمري','الحسن عادل الرجبي','وسام سلطان السناني','يمان أحمد الجهني','يوسف فلاح الحربي','يوسف محمد الجهني'
];
const staleNames=[
  'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','ريان محمود - باري','وائل محمد حسين روزي'
];

const roster=readFileSync('server/class-roster.js','utf8');
const main=readFileSync('src/main.tsx','utf8');
const index=readFileSync('index.html','utf8');
const displayPatch=existsSync('public/student-display-names.js')?readFileSync('public/student-display-names.js','utf8'):'';

const checks=[
  ['server roster has exactly the approved three-part display names',approvedNames.every(name=>roster.includes(`'${name}'`))&&staleNames.every(name=>!roster.includes(name))],
  ['main roster has exactly the approved three-part display names',approvedNames.every(name=>main.includes(`'${name}'`))&&staleNames.every(name=>!main.includes(name))],
  ['display-name guard exists and is loaded',displayPatch.length>0&&index.includes('/student-display-names.js')],
  ['display-name guard maps all existing student ids without renumbering them',approvedNames.every((name,index)=>displayPatch.includes(`'s2-4-${String(index+1).padStart(2,'0')}':'${name}'`))],
  ['display-name guard removes known stale visible names',staleNames.every(name=>displayPatch.includes(`'${name}'`))&&displayPatch.includes('MutationObserver')],
];

const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  console.error('Student display-name regression checks failed:');
  for(const [name] of failed)console.error(`- ${name}`);
  process.exit(1);
}
console.log(`Student display-name regression checks passed (${checks.length}/${checks.length}).`);
