import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const state=readFileSync('api/student-state.js','utf8');
const access=readFileSync('public/student-access-guard.js','utf8');

assert.equal(state.includes('MAX_GUARDIAN_DEVICES'),false,'guardian access must not be limited to specific devices');
assert.equal(state.includes("action==='access_claim'"),false,'guardian access must not claim a browser device');
assert.equal(state.includes("action==='access_verify'"),false,'guardian access must not verify a browser device');
assert.equal(state.includes("action==='access_release'"),false,'guardian access must not need device release');
assert.equal(state.includes('verifyGuardianInvite'),true,'student access must verify the stable link token on the server');
assert.equal(state.includes("String(req.query?.inviteToken||'')"),true,'student reads must verify the invite token from the link');
assert.equal(state.includes('const invite=current||requested||accessToken()'),true,'the server must reuse one canonical student link token');
assert.equal(access.includes('taallamtGuardianDevice:'),false,'student access must not depend on browser localStorage');
assert.equal(access.includes('randomToken'),false,'student access must not generate a per-device token');
assert.equal(access.includes("accessPost(studentId,'access_claim'"),false,'student link must not claim a device');
assert.equal(access.includes("accessPost(studentId,'access_verify'"),false,'student link must not verify a device');
assert.equal(access.includes("accessPost(activeAccess.studentId,'access_release'"),false,'student page must not expose device unlinking');
assert.equal(access.includes("parsed.searchParams.set('inviteToken',invite)"),true,'student state reads must reuse the fixed invite token');
assert.equal(access.includes("accessPost(studentId,'access_share',{})"),true,'teacher must request the canonical link token from the server');
assert.equal(access.includes('const invite=String(data.inviteToken||\'\')'),true,'teacher UI must share the canonical token returned by the server');

console.log('Guardian stable-link regression checks passed.');
