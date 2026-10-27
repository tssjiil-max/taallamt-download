import {OAuth2Client} from 'google-auth-library';
import {timingSafeEqual} from 'node:crypto';
const client=new OAuth2Client();
const verify=async(token,audience)=>(await client.verifyIdToken({idToken:token,audience})).getPayload();
export async function schedulerAuthorized(req,env=process.env,verifyToken=verify){
 const authorization=String(req.headers?.authorization||'');
 if(env.TAALLAMT_RUNTIME==='cloudrun'){
  if(!authorization.startsWith('Bearer ')||!env.TAALLAMT_SCHEDULER_EMAIL||!env.TAALLAMT_SCHEDULER_AUDIENCE)return false;
  try{const payload=await verifyToken(authorization.slice(7),env.TAALLAMT_SCHEDULER_AUDIENCE);return payload?.email===env.TAALLAMT_SCHEDULER_EMAIL&&payload?.email_verified===true}catch{return false}
 }
 // Preserve the existing Vercel scheduler contract until cutover is approved.
 const secret=env.CRON_SECRET?.trim();if(!secret)return true;
 const a=Buffer.from(authorization),b=Buffer.from(`Bearer ${secret}`);
 return a.length===b.length&&timingSafeEqual(a,b);
}
