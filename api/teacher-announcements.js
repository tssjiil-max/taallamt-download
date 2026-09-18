import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const now=()=>new Date().toISOString();
const jsonBody=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const clean=value=>String(value||'').trim();
const validStatus=value=>['draft','published','archived'].includes(value)?value:'draft';

function visibleToStudent(item,studentId){
  if(item.status!=='published')return false;
  if(item.classId&&item.classId!==CLASS_ID)return false;
  const targetType=item.targetType||'class';
  if(targetType==='class')return true;
  if(targetType==='student')return item.studentId===studentId;
  if(targetType==='students')return Array.isArray(item.studentIds)&&item.studentIds.includes(studentId);
  return false;
}

function sanitize(item){
  return {
    id:item.id,
    title:clean(item.title),
    body:clean(item.body),
    date:clean(item.date),
    status:validStatus(item.status),
    classId:item.classId||CLASS_ID,
    targetType:item.targetType||'class',
    studentId:item.targetType==='student'?clean(item.studentId):undefined,
    studentIds:item.targetType==='students'&&Array.isArray(item.studentIds)?item.studentIds.filter(Boolean):undefined,
    updatedAt:item.updatedAt||item.createdAt||''
  };
}

export default async function handler(req,res){
  try{
    const db=adminDb(),collection=db.collection(`${root()}/announcements`);
    if(req.method==='GET'){
      const studentId=clean(req.query?.studentId);
      if(studentId&&!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
      const snap=await collection.get();
      const items=snap.docs.map(doc=>sanitize({id:doc.id,...doc.data()}))
        .filter(item=>studentId?visibleToStudent(item,studentId):item.classId===CLASS_ID)
        .sort((a,b)=>String(b.updatedAt||b.date).localeCompare(String(a.updatedAt||a.date)))
        .slice(0,50);
      return res.status(200).json({ok:true,announcements:items});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=jsonBody(req),id=clean(body.id);
    if(!id)return res.status(400).json({ok:false,error:'ANNOUNCEMENT_ID_REQUIRED'});
    const title=clean(body.title);if(!title)return res.status(400).json({ok:false,error:'TITLE_REQUIRED'});
    const status=validStatus(body.status),targetType=['class','student','students'].includes(body.targetType)?body.targetType:'class';
    const patch={
      id,title,body:clean(body.body).slice(0,2000),date:clean(body.date)||now().slice(0,10),
      status,classId:CLASS_ID,targetType,updatedAt:now()
    };
    if(targetType==='student'){
      const studentId=clean(body.studentId);if(!getStudent(studentId))return res.status(400).json({ok:false,error:'STUDENT_NOT_FOUND'});
      patch.studentId=studentId;
    }else if(targetType==='students'){
      const studentIds=[...new Set((Array.isArray(body.studentIds)?body.studentIds:[]).map(clean).filter(id=>getStudent(id)))];
      if(!studentIds.length)return res.status(400).json({ok:false,error:'STUDENTS_REQUIRED'});
      patch.studentIds=studentIds;
    }
    const ref=collection.doc(id),existing=await ref.get();
    await ref.set({...patch,...(!existing.exists?{createdAt:now()}:{})},{merge:true});
    return res.status(200).json({ok:true,saved:true,announcement:sanitize({...patch,createdAt:existing.exists?existing.data()?.createdAt:now()})});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:500;
    console.error('teacher-announcements',message);
    return res.status(status).json({ok:false,error:message});
  }
}
