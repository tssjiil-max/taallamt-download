// This release enables isolated staging only. Production needs a separately reviewed cutover.
export function validateRuntime(env=process.env){
 const fail=code=>{throw new Error(code)};
 if(env.TAALLAMT_RUNTIME!=='cloudrun'||env.TAALLAMT_ENV!=='staging')fail('FIREBASE_STAGING_RUNTIME_REQUIRED');
 if(env.FIREBASE_PROJECT_ID!=='taallamt-988e6')fail('FIREBASE_PROJECT_MISMATCH');
 const databaseId=env.TAALLAMT_FIRESTORE_DATABASE;
 if(databaseId!=='taallamt-staging')fail('ISOLATED_STAGING_DATABASE_REQUIRED');
 const storageBucket=String(env.FIREBASE_STORAGE_BUCKET||'');
 if(!/^[a-z0-9][a-z0-9._-]*staging[a-z0-9._-]*$/.test(storageBucket))fail('ISOLATED_STAGING_BUCKET_REQUIRED');
 let origin;try{origin=new URL(env.TAALLAMT_PUBLIC_ORIGIN)}catch{fail('STAGING_ORIGIN_REQUIRED')}
 if(origin.protocol!=='https:'||origin.origin!==env.TAALLAMT_PUBLIC_ORIGIN||!origin.hostname.endsWith('.web.app')||['taallamt-988e6.web.app'].includes(origin.hostname))fail('ISOLATED_STAGING_ORIGIN_REQUIRED');
 if(String(env.TAALLAMT_SESSION_SECRET||'').length<32)fail('STABLE_SESSION_SECRET_REQUIRED');
 if(String(env.TAALLAMT_GRADING_SECRET||'').length<32)fail('STABLE_GRADING_SECRET_REQUIRED');
 if(String(env.TEACHER_ACCESS_CODE||'').replace(/[\s\-_.]/g,'').length<8)fail('TEACHER_PASSWORD_REQUIRED');
 if(env.TAALLAMT_STAGING_WRITE_ENABLED!=='1')fail('STAGING_WRITES_NOT_ENABLED');
 const schedulerEmail='taallamt-scheduler@taallamt-988e6.iam.gserviceaccount.com';
 if(env.TAALLAMT_SCHEDULER_EMAIL!==schedulerEmail)fail('SCHEDULER_IDENTITY_REQUIRED');
 let audience;try{audience=new URL(env.TAALLAMT_SCHEDULER_AUDIENCE)}catch{fail('SCHEDULER_AUDIENCE_REQUIRED')}
 if(audience.origin!==origin.origin||env.TAALLAMT_SCHEDULER_AUDIENCE!==origin.origin)fail('SCHEDULER_AUDIENCE_REQUIRED');
 return {projectId:env.FIREBASE_PROJECT_ID,databaseId,storageBucket,origin:origin.origin,secret:env.TAALLAMT_SESSION_SECRET,context:`${env.FIREBASE_PROJECT_ID}:staging:${databaseId}`};
}
