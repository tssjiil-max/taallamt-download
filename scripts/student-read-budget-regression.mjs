import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sync=readFileSync('src/student-sync.ts','utf8');
const access=readFileSync('public/student-access-guard.js','utf8');
const teacherHomework=readFileSync('public/teacher-homework-status.js','utf8');
const studentHomework=readFileSync('public/student-homework-autograde.js','utf8');
const studentEvaluation=readFileSync('public/student-teacher-evaluation.js','utf8');
const budget=readFileSync('public/student-state-read-budget.js','utf8');
const index=readFileSync('index.html','utf8');

assert.equal(sync.includes('window.setInterval(refresh,10000)'),false,'student page must not poll /api/student-state every 10 seconds');
assert.equal(sync.includes('STUDENT_REFRESH_THROTTLE_MS'),true,'student refreshes after focus/visibility must share a throttle window');
assert.equal(sync.includes('Date.now()-lastRefreshAt<STUDENT_REFRESH_THROTTLE_MS'),true,'student focus/visibility refreshes must skip duplicate reads inside the throttle window');
assert.equal(access.includes("const probe=new URL('/api/student-state'"),false,'guardian access must not make a separate student-state probe before the real page load');
assert.equal(access.includes("parsed.searchParams.set('guardianAccess','1')"),true,'the real student-state GET must carry guardian access verification');
assert.equal(access.includes("document.documentElement.classList.remove('studentAccessPending')"),true,'the first successful real student-state GET must unlock the student page');
assert.equal(teacherHomework.includes('setInterval(refresh,10000)'),false,'teacher homework panel must not poll student-state every 10 seconds');
assert.equal(studentHomework.includes('setInterval(refresh,12000)'),false,'student homework autograde must not poll student-state every 12 seconds');
assert.equal(studentHomework.includes('setTimeout(refresh,500)'),false,'student homework autograde must not issue a duplicate startup read');
assert.equal(studentEvaluation.includes('const timer=setInterval'),false,'student evaluation boot must not launch overlapping student-state reads');
assert.equal(budget.includes("url.pathname!=='/api/student-state'"),true,'student-state reads must pass through the shared read budget');
assert.equal(budget.includes('inflight.has(key)'),true,'concurrent student-state reads must be coalesced');
assert.equal(budget.includes('cache.clear()'),true,'state-changing requests must invalidate the short read cache');
assert.equal(index.indexOf('/student-state-read-budget.js')<index.indexOf('/student-access-guard.js'),true,'read budget must load before guardian access wraps fetch');

console.log('Student read-budget regression checks passed.');
