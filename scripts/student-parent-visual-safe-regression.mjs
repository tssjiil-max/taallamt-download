import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const cssPath='public/student-parent-visual-safe.css';
const jsPath='public/student-parent-visual-safe.js';
const index=readFileSync('index.html','utf8');

assert.equal(existsSync(cssPath),true,'student parent visual stylesheet must exist');
assert.equal(existsSync(jsPath),true,'student parent visual script must exist');

const css=readFileSync(cssPath,'utf8');
const js=readFileSync(jsPath,'utf8');

assert.ok(index.indexOf('/student-parent-visual-safe.css')>index.indexOf('/student-teacher-palette.css'),'visual stylesheet must load after the teacher palette');
assert.ok(index.indexOf('/student-parent-visual-safe.js')>index.indexOf('/student-shakabumbo-icons.js'),'visual script must load after existing student icon scripts');

assert.ok(css.includes('.student>.studentDay{display:contents!important}'),'student day wrapper must be visually flattened so task/evaluation can be ordered safely');
assert.ok(css.includes('.student>.studentDay>.dayPanel:first-child{order:2!important}'),'today tasks must follow the student card');
assert.ok(css.includes('.student>.subjects{order:3!important}'),'subjects must follow today tasks');
assert.ok(css.includes('.student>.studentDay>.dayPanel[data-teacher-evaluation="true"]{order:4!important}'),'teacher evaluation must follow subjects');
assert.ok(css.includes('.student>.rewards{order:5!important}'),'rewards must follow teacher evaluation');
assert.ok(css.includes('.student .studentSubject::after{display:none!important}'),'subject name must not be duplicated outside the supplied artwork');
assert.ok(css.includes('width:124px!important')&&css.includes('height:124px!important'),'subject artwork must be large and equal-sized');
assert.ok(!css.includes('.teacher '),'student visual override must not style teacher pages');

for(const asset of [
  '/shakabumbo-icons/03_lughati.svg',
  '/shakabumbo-icons/04_imlaa_khatt.svg',
  '/shakabumbo-icons/05_quran.svg',
  '/shakabumbo-icons/06_islamic_studies.svg',
  '/shakabumbo-icons/02_main_logo.svg',
  '/shakabumbo-icons/07_star_of_day.svg'
]) assert.ok(js.includes(asset),`expected supplied artwork ${asset}`);

assert.ok(js.includes("location.pathname.startsWith('/student')"),'visual script must be restricted to the student route');
assert.ok(js.includes('/api/student-state'),'home cards must read existing student state');
assert.ok(!js.includes('localStorage.setItem'),'visual script must not mutate stored student data');
assert.ok(js.includes("attributeFilter:['src','data-clean-source']"),'visual script must keep supplied SVG artwork stable after existing student patches run');

for(const label of ['الخطة الأسبوعية','التقييم','الواجبات','النجوم','weeklyPlan','assessments','homeworkEvidence','state.stars'])assert.ok(js.includes(label),`student home should render live ${label}`);
assert.ok(css.includes('.studentHomeReference>.studentDay>.homeDataCard.weekly')&&css.includes('.studentHomeReference>.studentDay>.homeDataCard.assessment')&&css.includes('.studentHomeReference>.studentDay>.homeDataCard.homework'),'student card order should match the approved reference');
console.log('Student/parent visual-safe regression checks passed.');
