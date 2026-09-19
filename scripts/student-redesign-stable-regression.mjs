import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index=readFileSync('index.html','utf8');
const css=readFileSync('public/student-redesign-safe-v1.css','utf8');

assert.equal(index.includes('/student-redesign-safe-v1.css'),true,'stable build must load the approved student redesign');
assert.equal(index.indexOf('/student-redesign-safe-v1.css')>index.indexOf('/student-profile-refine.css'),true,'student redesign must load after older student styles');
assert.equal(css.includes('background:linear-gradient(180deg,#edf9ff'),true,'approved sky-blue student background must remain present');
assert.equal(css.includes('.student .starGrid'),true,'student star challenge styling must remain present');
assert.equal(css.includes('.student .studentNav'),true,'student mobile navigation styling must remain present');

console.log('Stable student redesign regression checks passed.');
