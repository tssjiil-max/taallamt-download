import {randomBytes} from 'node:crypto';
import {adminDb,adminStorageBucket,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const now=()=>new Date().toISOString();
const uid=()=>`file_${Date.now()}_${randomBytes(4).toString('hex')}`;
const categories=new Set(['books','worksheets','remediation','weekly','assessments','spelling','teacher-portfolio','general']);
const visibilities=new Set(['public','private','teacher']);
const allowedMime=new Set(['application/pdf','image/jpeg','image/png','image/webp','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const jsonBody=(req)=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const cleanName=(value)=>String(value||'file').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,' ').trim().slice(0,120)||'file';
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));

function canSee(item,studentId,role){
  if(role==='teacher')return true;
  if(item.visibility==='public')return true;
  return item.visibility==='private'&&studentId&&Array.isArray(item.targetStudentIds)&&item.targetStudentIds.includes(studentId);
}
function safeMeta(item){const {storagePath,...safe}=item;return safe}

async function listFiles(req,res){
  const role=String(req.query?.role||'student')==='teacher'?'teacher':'student';
  const studentId=String(req.query?.studentId||'');
  if(role==='student'&&studentId&&!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
  const snap=await adminDb().collection(`${root()}/files`).get();
  const files=rows(snap).filter(item=>canSee(item,studentId,role)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(safeMeta);
  return res.status(200).json({ok:true,files});
}

async function uploadFile(req,res){
  previewWriteGuard();
  const body=jsonBody(req),category=String(body.category||'general'),visibility=String(body.visibility||'teacher');
  if(!categories.has(category))return res.status(400).json({ok:false,error:'CATEGORY_INVALID'});
  if(!visibilities.has(visibility))return res.status(400).json({ok:false,error:'VISIBILITY_INVALID'});
  const title=String(body.title||body.name||'').trim().slice(0,160);if(!title)return res.status(400).json({ok:false,error:'TITLE_REQUIRED'});
  const name=cleanName(body.name||title),mimeType=String(body.mimeType||'application/octet-stream');
  if(!allowedMime.has(mimeType))return res.status(400).json({ok:false,error:'FILE_TYPE_NOT_ALLOWED'});
  const encoded=String(body.base64||'').replace(/^data:[^;]+;base64,/,''),buffer=Buffer.from(encoded,'base64');
  if(!buffer.length)return res.status(400).json({ok:false,error:'FILE_REQUIRED'});
  if(buffer.length>3_000_000)return res.status(413).json({ok:false,error:'FILE_TOO_LARGE'});
  let targetStudentIds=Array.isArray(body.targetStudentIds)?[...new Set(body.targetStudentIds.map(String).filter(id=>getStudent(id)))]:[];
  if(visibility==='private'&&!targetStudentIds.length)return res.status(400).json({ok:false,error:'PRIVATE_TARGET_REQUIRED'});
  if(visibility!=='private')targetStudentIds=[];
  const id=uid(),storagePath=`workspaces/${WORKSPACE_ID}/library/${id}/${name}`,bucket=adminStorageBucket();
  await bucket.file(storagePath).save(buffer,{contentType:mimeType,resumable:false,metadata:{cacheControl:'private, max-age=0, no-store'}});
  const record={id,title,name,mimeType,category,visibility,targetStudentIds,storagePath,size:buffer.length,subject:String(body.subject||'').trim().slice(0,80),portfolioSection:String(body.portfolioSection||'').trim().slice(0,100),note:String(body.note||'').trim().slice(0,500),approvedForAI:Boolean(body.approvedForAI),source:'teacher_upload',createdAt:now(),updatedAt:now()};
  await adminDb().doc(`${root()}/files/${id}`).set(record);
  return res.status(201).json({ok:true,file:safeMeta(record)});
}

async function downloadFile(req,res){
  const id=String(req.query?.id||''),role=String(req.query?.role||'student')==='teacher'?'teacher':'student',studentId=String(req.query?.studentId||'');
  const snap=await adminDb().doc(`${root()}/files/${id}`).get();if(!snap.exists)return res.status(404).json({ok:false,error:'FILE_NOT_FOUND'});
  const item={id:snap.id,...snap.data()};if(!canSee(item,studentId,role))return res.status(403).json({ok:false,error:'FILE_FORBIDDEN'});
  const [buffer]=await adminStorageBucket().file(item.storagePath).download();
  res.setHeader('Content-Type',item.mimeType||'application/octet-stream');
  res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(item.name||item.title||'file')}`);
  res.setHeader('Cache-Control','private, no-store');return res.status(200).send(buffer);
}

export default async function handler(req,res){
  try{
    const action=String(req.query?.action||'list');
    if(req.method==='GET'&&action==='download')return await downloadFile(req,res);
    if(req.method==='GET')return await listFiles(req,res);
    if(req.method==='POST')return await uploadFile(req,res);
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
