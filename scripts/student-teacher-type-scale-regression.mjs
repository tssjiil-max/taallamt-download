import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const path='public/student-teacher-type-scale.css';
assert.equal(existsSync(path),true,'approved type scale stylesheet must exist');
const css=readFileSync(path,'utf8'),index=readFileSync('legacy.html','utf8');

assert.ok(index.includes('/student-teacher-type-scale.css'),'type scale must be linked');
assert.ok(index.indexOf('/student-teacher-type-scale.css')>index.indexOf('/student-parent-visual-safe.css'),'type scale must load after the student visual layer so equal-specificity rules resolve to it');

// Sizes and weights only: the approval covered type and inline icon size, nothing else.
const allowed=new Set(['font-size','font-weight','line-height','font-family','width','height']);
const body=css.replace(/\/\*[\s\S]*?\*\//g,'');
for(const match of body.matchAll(/\{([^{}]*)\}/g)){
  for(const declaration of match[1].split(';').map(item=>item.trim()).filter(Boolean)){
    const property=declaration.split(':')[0].trim();
    assert.ok(allowed.has(property),`type scale must not set "${property}" (found: ${declaration})`);
  }
}
for(const selector of body.split('{').map(part=>part.split('}').pop().trim()).filter(part=>part&&!part.startsWith('@'))){
  for(const single of selector.split(',').map(item=>item.trim()).filter(Boolean)){
    assert.ok(/^\.(teacher|student|screen\.teacher|screen\.student)\b/.test(single),`type scale selector must be scoped to the teacher or student page: ${single}`);
  }
}

// Approved values at the widest tier, and the two narrower tiers that keep text inside the existing cards.
assert.ok(css.includes('.teacher .teacherIdentity b{font-size:19px!important;font-weight:800!important'),'teacher name size');
assert.ok(css.includes('.teacher .teacherStat strong{font-size:20px!important;font-weight:800!important'),'stat number size');
assert.ok(css.includes('.student .dayPanel h3{font-size:17.5px!important;font-weight:800!important'),'student section title size');
assert.ok(css.includes('.student .taskText b{font-size:14.5px!important;font-weight:700!important'),'student task title size');
assert.ok(css.includes('@media(max-width:407px)')&&css.includes('@media(max-width:375px)'),'narrow-screen tiers must stay');
assert.ok(!/studentSubjectMascot|shakabumbo|rewardMascot|studentNavMascot/.test(css),'Shakabumbo artwork sizes must not be touched');

console.log('Student/teacher type-scale regression checks passed.');
