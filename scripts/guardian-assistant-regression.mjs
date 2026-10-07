// Regression coverage for the guardian-facing assistant agent.
import assert from 'node:assert/strict';
import {register} from 'node:module';

register('./lib/fake-firebase-hooks.mjs',import.meta.url);

const RealDate=Date;let nowMs=RealDate.parse('2026-10-04T04:30:00Z');
class FakeDate extends RealDate{constructor(...args){if(args.length)super(...args);else super(nowMs)}static now(){return nowMs}}
globalThis.Date=FakeDate;

process.env.VERCEL_ENV='preview';
process.env.FIREBASE_PROJECT_ID='fake';
process.env.FIREBASE_CLIENT_EMAIL='fake@fake';
process.env.FIREBASE_PRIVATE_KEY='fake-private-key';
process.env.TEACHER_ACCESS_CODE='guardian-agent-test-2468';
delete process.env.OPENAI_API_KEY;delete process.env.GEMINI_API_KEY;

const {fakeStore}=await import('./lib/fake-firestore.mjs');
const automation=(await import('../api/learning-automation.js')).default;
const studentState=(await import('../api/student-state.js')).default;
const cronDaily=(await import('../api/cron-daily.js')).default;
const {WORKSPACE_ID}=await import('../server/class-roster.js');
const {ROSTER}=await import('../server/roster.js');

const HOST='agent.example.test';
function call(handler,{method='GET',query={},body,cookie='',origin=`https://${HOST}`}={}){
  return new Promise((resolve,reject)=>{
    const res={statusCode:200,headers:{},status(code){this.statusCode=code;return this},setHeader(name,value){this.headers[name.toLowerCase()]=value;return this},
      json(payload){resolve({status:this.statusCode,body:payload,headers:this.headers})},send(payload){resolve({status:this.statusCode,body:payload,headers:this.headers})}};
    const headers={host:HOST,'x-real-ip':'198.51.100.42'};if(method==='POST'&&origin)headers.origin=origin;if(cookie)headers.cookie=cookie;
    Promise.resolve(handler({method,query,body,headers},res)).catch(reject);
  });
}
const docs=prefix=>[...fakeStore.entries()].filter(([key])=>key.startsWith(`workspaces/${WORKSPACE_ID}/${prefix}/`)).map(([key,value])=>({key,...value}));
let teacher='';
const TP=(action,body={})=>call(automation,{method:'POST',body:{action,...body},cookie:teacher});
const TG=(action,query={})=>call(automation,{query:{action,...query},cookie:teacher});
const studentId=ROSTER[0].id,other=ROSTER[1];
let invite='';
const send=(text,clientId)=>call(studentState,{method:'POST',body:{studentId,action:'message_send',invite,text,clientId}});
const thread=()=>call(studentState,{query:{view:'messages',studentId,invite}});

const login=await call(automation,{method:'POST',body:{action:'login',code:process.env.TEACHER_ACCESS_CODE}});
assert.equal(login.status,200);teacher=String(login.headers['set-cookie']).split(';')[0];
assert.equal((await call(cronDaily)).status,200);
invite=(await call(studentState,{method:'POST',body:{studentId,action:'access_share'},cookie:teacher})).body.inviteToken;
assert.ok(invite);

let r=await send('وش واجب اليوم؟','agent_hw_0001');
assert.equal(r.status,200);assert.equal(r.body.assistant.classification,'routine');assert.equal(r.body.assistant.assistantReplied,true);
let t=(await thread()).body;
assert.ok(t.messages.some(m=>m.from==='assistant'&&m.text.includes('واجب اليوم')));

r=await send('وش درس لغتي؟','agent_lesson_0002');
assert.equal(r.body.assistant.classification,'routine');
t=(await thread()).body;
assert.ok(t.messages.some(m=>m.from==='assistant'&&m.text.includes('عذرًا يا جدي')));

assert.equal((await call(studentState,{method:'POST',body:{studentId,action:'star'},cookie:teacher})).status,200);
r=await send('كم عنده نجمة؟','agent_star_0003');
assert.equal(r.body.assistant.classification,'routine');
t=(await thread()).body;assert.ok(t.messages.some(m=>m.from==='assistant'&&m.text.includes('1 نجمة')));

assert.equal((await TP('assess_one',{subjectKey:'quran',studentId,result:'mastered'})).status,200);
r=await send('هل أتقن القرآن؟','agent_quran_0004');
assert.equal(r.body.assistant.classification,'routine');
t=(await thread()).body;assert.ok(t.messages.some(m=>m.from==='assistant'&&m.text.includes('أتقن')));

r=await send('ابني عنده مشكلة مع طالب وأبغى أكلم المعلم','agent_sensitive_0005');
assert.equal(r.body.assistant.classification,'teacher_required');assert.equal(r.body.assistant.needsTeacherReply,true);
let inbox=(await TG('messages_inbox')).body;
assert.equal(inbox.threads.find(x=>x.studentId===studentId).needsTeacherReply,true);

const beforeDuplicate=docs('messages').filter(x=>x.from==='assistant').length;
r=await send('ابني عنده مشكلة مع طالب وأبغى أكلم المعلم','agent_sensitive_0005');
assert.equal(r.status,200);
assert.equal(docs('messages').filter(x=>x.from==='assistant').length,beforeDuplicate,'same message never gets a second assistant reply');

r=await send(`كم نجوم ${other.name.split(' ').slice(0,2).join(' ')}؟`,'agent_other_0006');
assert.equal(r.body.assistant.classification,'teacher_required','another student is never answered');

r=await send('هل أتقن الإملاء؟','agent_nodata_0007');
assert.equal(r.body.assistant.classification,'teacher_required');assert.ok(r.body.assistant.reply.includes('معلومة مؤكدة'));

assert.equal((await TP('guardian_assistant_settings',{mode:'off'})).status,200);
const assistantCountBeforeOff=docs('messages').filter(x=>x.from==='assistant').length;
r=await send('وش واجب اليوم؟','agent_off_0008');
assert.equal(r.body.assistant.mode,'off');assert.equal(r.body.assistant.assistantReplied,false);
assert.equal(docs('messages').filter(x=>x.from==='assistant').length,assistantCountBeforeOff);

assert.equal((await TP('guardian_assistant_settings',{mode:'suggest'})).status,200);
r=await send('كم عنده نجمة؟','agent_suggest_0009');
assert.equal(r.body.assistant.mode,'suggest');assert.ok(r.body.assistant.suggestedReply.includes('نجمة'));
const suggestionThread=(await TG('messages_thread',{studentId})).body;
assert.ok(suggestionThread.assistantState.suggestedReply.includes('نجمة'));assert.equal(suggestionThread.assistantState.needsTeacherReply,true);

assert.equal((await TP('guardian_assistant_settings',{mode:'auto_routine',provider:'openai'})).status,200);
process.env.OPENAI_API_KEY='sk-test-guardian-agent-1234567890';
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:false,status:500,json:async()=>({error:{message:'simulated provider failure'}})});
try{
  r=await send('هل يوجد نشاط خاص غدًا؟','agent_provider_0010');
  assert.equal(r.status,200);assert.equal(r.body.assistant.classification,'teacher_required');assert.equal(r.body.assistant.assistantReplied,true);
}finally{globalThis.fetch=originalFetch;delete process.env.OPENAI_API_KEY}

r=await send('كيف أستخدم الصفحة؟','agent_usage_0011');
assert.equal(r.body.assistant.classification,'routine');assert.equal(r.body.assistant.needsTeacherReply,false);

inbox=(await TG('messages_inbox')).body;
assert.equal(inbox.assistant.mode,'auto_routine');
assert.equal(inbox.assistant.limit,100);

console.log('Guardian assistant regression passed (routine, privacy, idempotency, off, suggest, auto, provider failure).');
