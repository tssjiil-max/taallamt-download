import {it,expect} from 'vitest';
const options={secret:'x'.repeat(48),context:'taallamt-988e6:staging:taallamt-staging',now:100000};
it('retains student login when teacher logs in and logs out on the same device',async()=>{
 const {readHostingSession,updateHostingSession}=await import('../server/hosting-session.mjs');
 let cookie=updateHostingSession('', 'taallamt_student=student-token; Max-Age=15552000',options);
 cookie=updateHostingSession(cookie,'taallamt_teacher=teacher-token; Max-Age=2592000',options);
 expect(readHostingSession(cookie,options).student.token).toBe('student-token');
 expect(readHostingSession(cookie,options).teacher.token).toBe('teacher-token');
 cookie=updateHostingSession(cookie,'taallamt_teacher=; Max-Age=0',options);
 expect(readHostingSession(cookie,options).student.token).toBe('student-token');
 expect(readHostingSession(cookie,options).teacher).toBeUndefined();
 expect(cookie).toContain('__session=');expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax');
});
it('rejects tampering, wrong environment and expired role tokens',async()=>{
 const {readHostingSession,updateHostingSession}=await import('../server/hosting-session.mjs');
 const cookie=updateHostingSession('','taallamt_student=student-token; Max-Age=10',options);
 expect(readHostingSession(cookie,{...options,context:'production'})).toEqual({});
 expect(readHostingSession(cookie.replace('=','=!'),options)).toEqual({});
 expect(readHostingSession(cookie,{...options,now:110001})).toEqual({});
 expect(readHostingSession('taallamt_teacher=unsigned',options)).toEqual({});
 expect(readHostingSession(cookie,{...options,now:100500})).toHaveProperty('student');
});
