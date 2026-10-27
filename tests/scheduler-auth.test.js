import {it,expect,vi} from 'vitest';
it('requires a verified Google OIDC identity matching the scheduler account and audience',async()=>{
 const {schedulerAuthorized}=await import('../server/scheduler-auth.mjs');
 const env={TAALLAMT_RUNTIME:'cloudrun',TAALLAMT_SCHEDULER_EMAIL:'scheduler@test.iam.gserviceaccount.com',TAALLAMT_SCHEDULER_AUDIENCE:'https://test.run.app'};
 const verify=vi.fn(async()=>({email:env.TAALLAMT_SCHEDULER_EMAIL,email_verified:true}));
 expect(await schedulerAuthorized({headers:{}},env,verify)).toBe(false);expect(verify).not.toHaveBeenCalled();
 expect(await schedulerAuthorized({headers:{authorization:'Bearer google-signed-token'}},env,verify)).toBe(true);
 expect(verify).toHaveBeenCalledWith('google-signed-token',env.TAALLAMT_SCHEDULER_AUDIENCE);
 expect(await schedulerAuthorized({headers:{authorization:'Bearer token'}},env,async()=>({email:'other',email_verified:true}))).toBe(false);
 expect(await schedulerAuthorized({headers:{authorization:'Bearer token'}},env,async()=>{throw Error('invalid signature')})).toBe(false);
 expect(await schedulerAuthorized({headers:{authorization:'Bearer token'}},{...env,TAALLAMT_SCHEDULER_AUDIENCE:''},verify)).toBe(false);
});
