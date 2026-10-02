import fs from 'node:fs';

const main=fs.readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/ui.css',import.meta.url),'utf8');

const checks=[
  [!main.includes('className="nowCard"'),'teacher dashboard must not render the حصتي الآن card'],
  [!main.includes('className="ring"'),'curriculum panel must not render the old circular progress ring'],
  [main.includes('<div className="overallProgress"><div className="courseList">'),'curriculum panel must keep the subject progress list'],
  [/\.teacherStat b\{[^}]*font-size:10\.8px[^}]*font-weight:800/.test(css),'teacher stat titles must use the approved larger/heavier type'],
  [/\.teacherStat\.blue \.uiIcon\{[^}]*stroke-width:2\.2/.test(css),'message icon must have the approved visual weight'],
  [/\.courseProgress \.subjectIcon\{[^}]*width:20px[^}]*height:20px/.test(css),'curriculum book icons must be enlarged without changing data'],
  [/\.teacherPanels>\.panel:nth-child\(4\) h3\{gap:8px/.test(css),'announcement heading must have the approved icon spacing'],
  [/\.teacher \.mascotNav \.mascot\{[^}]*width:44px[^}]*height:44px/.test(css),'teacher nav mascot must be reduced by about five percent'],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){
  for(const [,message] of failed) console.error('FAIL:',message);
  process.exit(1);
}
console.log('teacher-dashboard-layout-regression: PASS');
