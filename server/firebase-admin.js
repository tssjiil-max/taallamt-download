import {cert,getApps,initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';

function normalizePrivateKey(raw){
  let value=String(raw||'').trim();
  if(value.startsWith('{')){try{const parsed=JSON.parse(value);if(typeof parsed.private_key==='string')value=parsed.private_key}catch{}}
  const fragment=value.match(/["']?private_key["']?\s*:\s*([\s\S]+)$/);
  if(fragment){let candidate=fragment[1].trim().replace(/,\s*$/,'');if(candidate.startsWith('"')){try{candidate=JSON.parse(candidate)}catch{candidate=candidate.replace(/^"|"$/g,'')}}else if(candidate.startsWith("'")&&candidate.endsWith("'"))candidate=candidate.slice(1,-1);value=candidate}else if(value.startsWith('"')&&value.endsWith('"')){try{value=JSON.parse(value)}catch{value=value.slice(1,-1)}}
  value=value.replace(/\\r/g,'').replace(/\\n/g,'\n').replace(/\r/g,'').trim();
  const pem=value.match(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/);if(pem)value=pem[0];
  return value;
}
function parseServiceAccount(raw){try{const parsed=JSON.parse(raw);if(typeof parsed.project_id!=='string'||typeof parsed.client_email!=='string'||typeof parsed.private_key!=='string')return null;return {projectId:parsed.project_id.trim(),clientEmail:parsed.client_email.trim(),privateKey:normalizePrivateKey(parsed.private_key)}}catch{return null}}
function credentials(){
  const base64=process.env.FIREBASE_SERVICE_ACCOUNT_B64?.trim();if(base64){try{const parsed=parseServiceAccount(Buffer.from(base64,'base64').toString('utf8'));if(parsed)return parsed}catch{}}
  const fullJson=process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();if(fullJson){const parsed=parseServiceAccount(fullJson);if(parsed)return parsed}
  const projectId=process.env.FIREBASE_PROJECT_ID?.trim(),clientEmail=process.env.FIREBASE_CLIENT_EMAIL?.trim(),privateKeyRaw=process.env.FIREBASE_PRIVATE_KEY;
  if(!projectId||!clientEmail||!privateKeyRaw)throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  const pasted=parseServiceAccount(privateKeyRaw.trim());if(pasted)return pasted;
  return {projectId,clientEmail,privateKey:normalizePrivateKey(privateKeyRaw)};
}
export function adminDb(){if(!getApps().length)initializeApp({credential:cert(credentials())});return getFirestore()}
export function previewWriteGuard(){if(process.env.VERCEL_ENV==='production')throw new Error('PRODUCTION_WRITE_BLOCKED')}
