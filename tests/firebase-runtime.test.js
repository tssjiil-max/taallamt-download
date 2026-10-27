import {describe,it,expect} from 'vitest';

const env={TAALLAMT_RUNTIME:'cloudrun',TAALLAMT_ENV:'staging',FIREBASE_PROJECT_ID:'taallamt-988e6',TAALLAMT_FIRESTORE_DATABASE:'taallamt-staging',FIREBASE_STORAGE_BUCKET:'taallamt-test-staging',TAALLAMT_PUBLIC_ORIGIN:'https://taallamt-test.web.app',TAALLAMT_SESSION_SECRET:'s'.repeat(48),TAALLAMT_GRADING_SECRET:'fixture-grading-secret-'.repeat(3),TEACHER_ACCESS_CODE:'test-teacher-password',TAALLAMT_STAGING_WRITE_ENABLED:'1',TAALLAMT_SCHEDULER_EMAIL:'taallamt-scheduler@taallamt-988e6.iam.gserviceaccount.com',TAALLAMT_SCHEDULER_AUDIENCE:'https://taallamt-test.web.app'};
describe('isolated Firebase staging runtime',()=>{
 it('accepts only the owner-selected project and an explicitly isolated runtime',async()=>{
  const {validateRuntime}=await import('../server/firebase-runtime.mjs');
  expect(validateRuntime(env).databaseId).toBe('taallamt-staging');
  for(const patch of [{FIREBASE_PROJECT_ID:'other-project'},{TAALLAMT_ENV:'production'},{TAALLAMT_ENV:''},{TAALLAMT_FIRESTORE_DATABASE:'(default)'},{TAALLAMT_FIRESTORE_DATABASE:''},{FIREBASE_STORAGE_BUCKET:'taallamt-988e6.appspot.com'},{FIREBASE_STORAGE_BUCKET:'taallamt-988e6.firebasestorage.app'},{TAALLAMT_SESSION_SECRET:'short'},{TAALLAMT_GRADING_SECRET:''},{TEACHER_ACCESS_CODE:''},{TAALLAMT_PUBLIC_ORIGIN:'https://taallamt-988e6.web.app'},{TAALLAMT_STAGING_WRITE_ENABLED:''},{TAALLAMT_SCHEDULER_EMAIL:'other@example.com'},{TAALLAMT_SCHEDULER_AUDIENCE:'https://other.web.app'}])expect(()=>validateRuntime({...env,...patch})).toThrow();
 });
 it('blocks writes if runtime configuration is changed after startup',async()=>{
  const {validateRuntime}=await import('../server/firebase-runtime.mjs');
  expect(()=>validateRuntime({...env,TAALLAMT_STAGING_WRITE_ENABLED:'0'})).toThrow();
 });
});
