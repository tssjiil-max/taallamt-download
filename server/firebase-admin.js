import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

function credentials(){
  const projectId=process.env.FIREBASE_PROJECT_ID;
  const clientEmail=process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=(process.env.FIREBASE_PRIVATE_KEY||'').replace(/\\n/g,'\n');
  if(!projectId||!clientEmail||!privateKey)throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return {projectId,clientEmail,privateKey};
}

export function adminDb(){
  if(!getApps().length)initializeApp({credential:cert(credentials())});
  return getFirestore();
}

export function previewWriteGuard(){
  if(process.env.VERCEL_ENV==='production')throw new Error('PRODUCTION_WRITE_BLOCKED');
}
