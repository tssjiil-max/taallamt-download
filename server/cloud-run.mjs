import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {isIP} from 'node:net';
import {validateRuntime} from './firebase-runtime.mjs';
import {legacySessionCookies,updateHostingSession} from './hosting-session.mjs';

const endpoints=['action-smoke','backend-status','cron-daily','cron-weekly','homework-complete','learning-automation','library-files','remediation-suggestions','star-adjust','student-evaluation','student-state','teacher-portfolio'];
async function loadHandlers(){
 const entries=await Promise.all(endpoints.map(async name=>[`/api/${name}`,(await import(`../api/${name}.js`)).default]));
 return Object.fromEntries(entries);
}
class HttpError extends Error{constructor(status,code){super(code);this.status=status}}
function httpError(status,code){return new HttpError(status,code)}
async function readBody(req,limit){
 if(Number(req.headers['content-length'])>limit){req.resume();throw httpError(413,'REQUEST_TOO_LARGE')}
 const chunks=[];let bytes=0;
 for await(const chunk of req){bytes+=chunk.length;if(bytes<=limit)chunks.push(chunk)}
 if(bytes>limit)throw httpError(413,'REQUEST_TOO_LARGE');
 if(!bytes)return {};
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw httpError(415,'JSON_REQUIRED');
 try{const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw Error();return body}catch{throw httpError(400,'JSON_INVALID')}
}
export async function createCloudRunServer({env=process.env,handlers,bodyLimit=5_000_000}={}){
 validateRuntime(env);
 const routes=handlers||await loadHandlers();
 const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.status=n=>{res.statusCode=n;return res};
  res.json=data=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return res};
  res.send=data=>{res.end(data);return res};
  try{
   const config=validateRuntime(env),url=new URL(req.url,'http://runtime.invalid');
   if(url.pathname==='/healthz'&&['GET','HEAD'].includes(req.method))return res.json({ok:true,environment:'staging',release:String(env.TAALLAMT_RELEASE_SHA||'').slice(0,40)});
   const handler=routes[url.pathname];if(typeof handler!=='function')return res.status(404).json({ok:false,error:'API_NOT_FOUND'});
   if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
   const scheduled=['/api/cron-daily','/api/cron-weekly'].includes(url.pathname);
   if(req.method==='POST'&&!scheduled&&req.headers.origin!==config.origin)return res.status(403).json({ok:false,error:'ORIGIN_INVALID'});
   req.query=Object.fromEntries(url.searchParams);
   if(req.method==='GET'&&req.query.action==='logout')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
   req.body=req.method==='POST'?await readBody(req,bodyLimit):{};
   // Pin the trusted origin rather than trusting client-supplied forwarding headers.
   req.headers['x-forwarded-host']=new URL(config.origin).host;
   // Ignore caller-supplied X-Real-IP and the untrusted left side of a proxy chain.
   // Verify Google/Hosting's actual rightmost hop in deployed staging before production.
   const lastHop=String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim();
   const clientAddress=isIP(lastHop)?lastHop:req.socket.remoteAddress||'unknown';
   req.headers['x-real-ip']=clientAddress;req.headers['x-forwarded-for']=clientAddress;
   const originalCookie=req.headers.cookie||'';
   req.headers.cookie=legacySessionCookies(originalCookie,config);
   let sessionCookie=originalCookie;
   const setHeader=res.setHeader.bind(res);
   res.setHeader=(name,value)=>{
    if(name.toLowerCase()==='set-cookie'){
     sessionCookie=updateHostingSession(sessionCookie,value,config);
     return setHeader(name,sessionCookie);
    }
    return setHeader(name,value);
   };
   await handler(req,res);
   if(!res.writableEnded)res.status(500).json({ok:false,error:'HANDLER_RESPONSE_MISSING'});
  }catch(error){
   // Never emit exception messages, URLs, credentials or student content to logs.
   if(!res.headersSent)res.status(error instanceof HttpError?error.status:503).json({ok:false,error:error instanceof HttpError?error.message:'RUNTIME_UNAVAILABLE'});
   else if(!res.writableEnded)res.end();
  }
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=await createCloudRunServer();
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0');
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),9000).unref()});
}
