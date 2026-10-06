import {teacherGate} from '../server/access.js';
import {IS_PRODUCTION} from '../server/class-roster.js';

// Diagnostics only: tells which environment answers and whether its pieces are configured. No secrets, no student data.
export default function handler(req,res){
  const hasSplit=Boolean(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY);
  const hasJson=Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const gate=teacherGate();
  res.status(200).json({ok:true,environment:process.env.VERCEL_ENV||'unknown',firebaseAdminConfigured:hasSplit||hasJson,splitServiceAccount:hasSplit,jsonServiceAccount:hasJson,
    dataWorkspace:IS_PRODUCTION?'production':'staging',teacherGateConfigured:gate.configured,teacherGateSource:gate.configured?gate.source:null,
    commit:String(process.env.VERCEL_GIT_COMMIT_SHA||'').slice(0,7),branch:process.env.VERCEL_GIT_COMMIT_REF||''});
}
