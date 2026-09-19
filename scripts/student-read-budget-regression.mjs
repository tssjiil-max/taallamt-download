import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sync=readFileSync('src/student-sync.ts','utf8');
const access=readFileSync('public/student-access-guard.js','utf8');

assert.equal(sync.includes('window.setInterval(refresh,10000)'),false,'student page must not poll /api/student-state every 10 seconds');
assert.equal(sync.includes('STUDENT_REFRESH_THROTTLE_MS'),true,'student refreshes after focus/visibility must share a throttle window');
assert.equal(sync.includes('Date.now()-lastRefreshAt<STUDENT_REFRESH_THROTTLE_MS'),true,'student focus/visibility refreshes must skip duplicate reads inside the throttle window');
assert.equal(access.includes("const probe=new URL('/api/student-state'"),false,'guardian access must not make a separate student-state probe before the real page load');
assert.equal(access.includes("parsed.searchParams.set('guardianAccess','1')"),true,'the real student-state GET must carry guardian access verification');
assert.equal(access.includes("document.documentElement.classList.remove('studentAccessPending')"),true,'the first successful real student-state GET must unlock the student page');

console.log('Student read-budget regression checks passed.');
