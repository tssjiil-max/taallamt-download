import {it,expect} from 'vitest';
const env={TAALLAMT_RUNTIME:'cloudrun',TAALLAMT_ENV:'staging',FIREBASE_PROJECT_ID:'taallamt-988e6',TAALLAMT_FIRESTORE_DATABASE:'taallamt-staging',FIREBASE_STORAGE_BUCKET:'taallamt-test-staging',TAALLAMT_PUBLIC_ORIGIN:'https://taallamt-test.web.app',TAALLAMT_SESSION_SECRET:'s'.repeat(48),TAALLAMT_GRADING_SECRET:'fixture-grading-secret-'.repeat(3),TEACHER_ACCESS_CODE:'test-teacher-password',TAALLAMT_STAGING_WRITE_ENABLED:'1',TAALLAMT_SCHEDULER_EMAIL:'taallamt-scheduler@taallamt-988e6.iam.gserviceaccount.com',TAALLAMT_SCHEDULER_AUDIENCE:'https://taallamt-test.web.app'};
it('serves the existing handler contract over HTTP with private caching and safe failures',async()=>{
 const {createCloudRunServer}=await import('../server/cloud-run.mjs');
 const server=await createCloudRunServer({env,handlers:{'/api/example':(req,res)=>res.status(201).json({query:req.query,value:req.body.value,host:req.headers['x-forwarded-host'],ip:req.headers['x-real-ip']}),'/api/failure':()=>{throw Object.assign(new Error('DO_NOT_EXPOSE'),{status:500})}},bodyLimit:40});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const headers={origin:env.TAALLAMT_PUBLIC_ORIGIN,'content-type':'application/json','x-forwarded-host':'attacker.example','x-real-ip':'attacker-controlled','x-forwarded-for':'203.0.113.8, 198.51.100.9'};
  const response=await fetch(`${base}/api/example?key=value`,{method:'POST',headers,body:JSON.stringify({value:7})});
  expect(response.status).toBe(201);expect(await response.json()).toEqual({query:{key:'value'},value:7,host:'taallamt-test.web.app',ip:'198.51.100.9'});
  expect(response.headers.get('cache-control')).toContain('no-store');
  expect((await fetch(`${base}/api/example`,{method:'POST',headers:{...headers,origin:'https://attacker.example'},body:'{}'})).status).toBe(403);
  expect((await fetch(`${base}/api/example`,{method:'POST',headers,body:'{bad'})).status).toBe(400);
  expect((await fetch(`${base}/api/example`,{method:'POST',headers,body:JSON.stringify({value:'x'.repeat(50)})})).status).toBe(413);
  expect((await fetch(`${base}/api/missing`)).status).toBe(404);
  expect((await fetch(`${base}/api/example`,{method:'DELETE'})).status).toBe(405);
  expect((await fetch(`${base}/healthz`)).status).toBe(200);
  expect(await (await fetch(`${base}/api/failure`)).json()).toEqual({ok:false,error:'RUNTIME_UNAVAILABLE'});
 }finally{await new Promise(resolve=>server.close(resolve))}
});
