import {createHmac,timingSafeEqual} from 'node:crypto';
const roles={taallamt_student:'student',taallamt_teacher:'teacher'};
const signature=(data,{secret,context})=>createHmac('sha256',secret).update(`${context}|${data}`).digest('base64url');
export function readHostingSession(cookie,{now=Date.now(),...options}){
 try{
  const value=String(cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__session='))?.slice(10)||'';
  if(value.length>3800)return {};
  const [payload,mac,...extra]=value.split('.');if(!payload||!mac||extra.length)return {};
  const expected=signature(payload,options),a=Buffer.from(mac),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return {};
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')),result={};
  for(const role of Object.values(roles)){
   const entry=data[role];
   if(entry&&typeof entry.token==='string'&&/^[A-Za-z0-9_.-]{1,256}$/.test(entry.token)&&Number.isFinite(entry.expires)&&entry.expires>now)result[role]=entry;
  }
  return result;
 }catch{return {}}
}
export function updateHostingSession(cookie,setCookie,{now=Date.now(),...options}){
 const state=readHostingSession(cookie,{...options,now});
 for(const item of Array.isArray(setCookie)?setCookie:[setCookie]){
  const [pair,...attributes]=String(item).split(';'),index=pair.indexOf('='),role=roles[pair.slice(0,index)];
  if(!role)continue;
  const token=pair.slice(index+1),maxAge=Number(attributes.map(x=>x.trim()).find(x=>/^max-age=/i.test(x))?.split('=')[1]||0);
  if(!token||!Number.isFinite(maxAge)||maxAge<=0)delete state[role];
  else{
   if(!/^[A-Za-z0-9_.-]{1,256}$/.test(token))throw new Error('SESSION_TOKEN_INVALID');
   state[role]={token,expires:now+Math.min(maxAge,180*86400)*1000};
  }
 }
 const seconds=Math.max(0,...Object.values(state).map(x=>Math.ceil((x.expires-now)/1000)));
 const payload=Buffer.from(JSON.stringify(state)).toString('base64url');
 return `__session=${seconds?`${payload}.${signature(payload,options)}`:''}; Path=/; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
}
export function legacySessionCookies(cookie,options){
 const state=readHostingSession(cookie,options);
 return Object.entries(roles).filter(([,role])=>state[role]).map(([name,role])=>`${name}=${state[role].token}`).join('; ');
}
