// Real HTTP + existing handlers + in-memory Firebase. Never connects to a live project.
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./lib/fake-firebase-hooks.mjs',import.meta.url);
Object.assign(process.env,{TAALLAMT_RUNTIME:'cloudrun',TAALLAMT_ENV:'staging',FIREBASE_PROJECT_ID:'taallamt-988e6',TAALLAMT_FIRESTORE_DATABASE:'taallamt-staging',FIREBASE_STORAGE_BUCKET:'taallamt-test-staging',TAALLAMT_PUBLIC_ORIGIN:'https://taallamt-test.web.app',TAALLAMT_SESSION_SECRET:'fixture-session-secret-'.repeat(3),TAALLAMT_GRADING_SECRET:'fixture-grading-secret-'.repeat(3),TEACHER_ACCESS_CODE:'fixture-teacher-password',TAALLAMT_STAGING_WRITE_ENABLED:'1',TAALLAMT_SCHEDULER_EMAIL:'taallamt-scheduler@taallamt-988e6.iam.gserviceaccount.com',TAALLAMT_SCHEDULER_AUDIENCE:'https://taallamt-test.web.app'});
delete process.env.VERCEL_ENV;
const {fakeStore,fakeDatabases}=await import('./lib/fake-firestore.mjs');
const {createCloudRunServer}=await import('../server/cloud-run.mjs');
const {WORKSPACE_ID}=await import('../server/class-roster.js');
const root=`workspaces/${WORKSPACE_ID}`,sid='s2-4-02',other='s2-4-03';
assert.equal(WORKSPACE_ID,'second-4-staging');
const profile={guardianInviteToken:'fixture-old-guardian-link-12345',stars:12};
fakeStore.set(`${root}/studentProfiles/${sid}`,profile);
fakeStore.set(`${root}/homeworkEvidence/fixture`,{studentId:sid,done:true});
let server,base;
async function start(){server=await createCloudRunServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`}
async function stop(){await new Promise(resolve=>server.close(resolve))}
async function call(path,{body,cookie='',origin=process.env.TAALLAMT_PUBLIC_ORIGIN}={}){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{origin,cookie,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')||'',cache:response.headers.get('cache-control')};
}
await start();
try{
 const login=await call('/api/learning-automation',{body:{action:'login',code:process.env.TEACHER_ACCESS_CODE}});
 assert.equal(login.status,200);assert.ok(login.cookie.startsWith('__session='));assert.ok(login.cache.includes('no-store'));
 assert.equal((await call('/api/learning-automation?action=session',{cookie:login.cookie})).body.teacher,true);
 assert.equal((await call('/api/learning-automation',{body:{action:'login',code:process.env.TEACHER_ACCESS_CODE},origin:'https://attacker.example'})).status,403);
 const endpoint='/api/student-state?view=student-login';
 let backup=await call(endpoint,{cookie:login.cookie,body:{action:'backup'}});
 for(let i=0;!backup.body.complete&&i<50;i++)backup=await call(endpoint,{cookie:login.cookie,body:{action:'backup',backupId:backup.body.backupId}});
 assert.equal(backup.status,200);assert.equal(backup.body.complete,true);
 const issued=await call(endpoint,{cookie:login.cookie,body:{action:'issue',studentId:sid,backupId:backup.body.backupId}});
 assert.equal(issued.status,200);assert.match(issued.body.pin,/^\d{6}$/);
 const student=await call(endpoint,{body:{studentId:sid,pin:issued.body.pin}});
 assert.equal(student.status,200);assert.ok(student.cookie.startsWith('__session='));
 assert.equal((await call(endpoint,{cookie:student.cookie})).body.session.studentId,sid);
 assert.equal((await call('/api/learning-automation?action=session',{cookie:student.cookie})).body.teacher,false);
 assert.equal((await call(`/api/student-state?studentId=${other}`,{cookie:student.cookie})).status,401);
 assert.equal((await call('/api/star-adjust',{cookie:student.cookie,body:{studentId:sid,delta:1,requestId:'fixture'}})).status,401);
 assert.equal((await call('/api/cron-daily')).status,401);
 assert.equal((await call('/api/cron-weekly')).status,401);
 // Restart represents another Cloud Run instance/revision with the same secret and database.
 await stop();process.env.TAALLAMT_RELEASE_SHA='fixture-new-revision';await start();
 assert.equal((await call(endpoint,{cookie:student.cookie})).body.session.studentId,sid);
 assert.equal((await call('/api/learning-automation?action=session',{cookie:login.cookie})).body.teacher,true);
 const shared=await call('/api/learning-automation',{cookie:student.cookie,body:{action:'login',code:process.env.TEACHER_ACCESS_CODE}});
 const logout=await call('/api/learning-automation',{cookie:shared.cookie,body:{action:'logout'}});
 assert.equal((await call('/api/learning-automation?action=session',{cookie:logout.cookie})).body.teacher,false);
 assert.equal((await call(endpoint,{cookie:logout.cookie})).body.session.studentId,sid);
 assert.deepEqual(fakeStore.get(`${root}/studentProfiles/${sid}`),profile);
 assert.deepEqual(fakeStore.get(`${root}/homeworkEvidence/fixture`),{studentId:sid,done:true});
 assert.equal([...fakeStore.keys()].filter(k=>k.startsWith(`${root}/studentProfiles/`)).length,1);
 assert.equal([...fakeStore.keys()].some(k=>k.startsWith('workspaces/second-4/')),false);
 assert.ok(fakeDatabases.length>0);assert.ok(fakeDatabases.every(name=>name==='taallamt-staging'));
 console.log('PASS: Cloud Run HTTP, teacher/student sessions, backup, six-digit PIN, access isolation, OIDC rejection, revision restart and fixture preservation. No live data used.');
}finally{await stop()}
