import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const state=readFileSync('api/student-state.js','utf8');
const access=readFileSync('public/student-access-guard.js','utf8');

assert.equal(state.includes('ACCESS_SHARE_FORBIDDEN'),false,'sharing must not depend on the browser that created the first invite');
assert.equal(state.includes("if(requested&&!validAccessToken(requested))"),true,'an optional client invite must still be validated');
assert.equal(state.includes('const invite=current||requested||accessToken()'),true,'the server must reuse the canonical invite or create it centrally');
assert.equal(state.includes('return {inviteToken:invite,devicesCount:devices.length,maxDevices:MAX_GUARDIAN_DEVICES}'),true,'every teacher device must receive the canonical invite');
assert.equal(access.includes('taallamtGuardianInvite:'),false,'teacher invite must not live in browser localStorage');
assert.equal(access.includes("accessPost(studentId,'access_share',{})"),true,'teacher must request the canonical invite directly from the server');
assert.equal(access.includes('const invite=String(data.inviteToken||\'\')'),true,'teacher UI must use only the canonical invite returned by the server');

console.log('Guardian link stability regression checks passed.');
