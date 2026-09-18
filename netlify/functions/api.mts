import type { Context } from '@netlify/functions';
import actionSmoke from '../../api/action-smoke.js';
import backendStatus from '../../api/backend-status.js';
import homeworkComplete from '../../api/homework-complete.js';
import learningAutomation from '../../api/learning-automation.js';
import libraryFiles from '../../api/library-files.js';
import remediationSuggestions from '../../api/remediation-suggestions.js';
import starAdjust from '../../api/star-adjust.js';
import studentEvaluation from '../../api/student-evaluation.js';
import studentState from '../../api/student-state.js';
import teacherPortfolio from '../../api/teacher-portfolio.js';

type LegacyHandler=(req:any,res:any)=>Promise<any>|any;

const handlers:Record<string,LegacyHandler>={
  'action-smoke':actionSmoke,
  'backend-status':backendStatus,
  'homework-complete':homeworkComplete,
  'learning-automation':learningAutomation,
  'library-files':libraryFiles,
  'remediation-suggestions':remediationSuggestions,
  'star-adjust':starAdjust,
  'student-evaluation':studentEvaluation,
  'student-state':studentState,
  'teacher-portfolio':teacherPortfolio,
};

function legacyResponse(){
  let statusCode=200;
  const headers=new Headers();
  let payload:BodyInit|null='';
  const response:any={
    status(code:number){statusCode=code;return response},
    setHeader(name:string,value:string){headers.set(name,String(value));return response},
    json(value:unknown){headers.set('content-type','application/json; charset=utf-8');payload=JSON.stringify(value);return response},
    send(value:any){payload=value instanceof Uint8Array?value:typeof value==='string'?value:JSON.stringify(value);return response},
    build(){return new Response(payload,{status:statusCode,headers})}
  };
  return response;
}

async function requestBody(request:Request){
  if(request.method==='GET'||request.method==='HEAD')return {};
  const text=await request.text();
  if(!text)return {};
  const contentType=request.headers.get('content-type')||'';
  if(contentType.includes('application/json')){try{return JSON.parse(text)}catch{return text}}
  return text;
}

function routeFromPathname(pathname:string){
  const prefixes=['/.netlify/functions/api/','/api/'];
  for(const prefix of prefixes){
    if(!pathname.startsWith(prefix))continue;
    const value=pathname.slice(prefix.length).split('/')[0]||'';
    try{return decodeURIComponent(value)}catch{return value}
  }
  return '';
}

export default async (request:Request,_context:Context)=>{
  const url=new URL(request.url);
  let route=url.searchParams.get('path')||routeFromPathname(url.pathname);
  url.searchParams.delete('path');
  if(route==='lesson-assistant'){
    route='learning-automation';
    if(!url.searchParams.has('action'))url.searchParams.set('action','assistant');
  }
  const handler=handlers[route];
  if(!handler)return new Response(JSON.stringify({ok:false,error:'API_NOT_FOUND'}),{status:404,headers:{'content-type':'application/json; charset=utf-8'}});

  const query=Object.fromEntries(url.searchParams.entries());
  const body=await requestBody(request);
  const req={method:request.method,headers:Object.fromEntries(request.headers.entries()),query,body};
  const res=legacyResponse();
  await handler(req,res);
  return res.build();
};
