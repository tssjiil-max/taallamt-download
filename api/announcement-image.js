import {adminDb,adminStorageBucket} from '../server/firebase-admin.js';
import {accessFailure,isTeacher,requireStudentAccess} from '../server/access.js';
import {workspaceRoot} from '../server/plan.js';

export default async function handler(req,res){
  try{
    if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const id=String(req.query?.id||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
    if(!id)return res.status(400).json({ok:false,error:'ANNOUNCEMENT_ID_REQUIRED'});
    const snap=await adminDb().doc(`${workspaceRoot()}/announcements/${id}`).get();
    if(!snap.exists)return res.status(404).json({ok:false,error:'ANNOUNCEMENT_NOT_FOUND'});
    const data=snap.data()||{};
    if(!isTeacher(req)){
      const studentId=String(req.query?.studentId||'');
      await requireStudentAccess(req,studentId,null);
      if(data.status!=='published')return res.status(404).json({ok:false,error:'ANNOUNCEMENT_NOT_FOUND'});
    }
    const path=String(data.imagePath||'');
    if(!path)return res.status(404).json({ok:false,error:'ANNOUNCEMENT_IMAGE_NOT_FOUND'});
    const [bytes]=await adminStorageBucket().file(path).download();
    res.setHeader('Content-Type',String(data.imageContentType||'image/jpeg'));
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    return res.status(200).send(bytes);
  }catch(error){
    if(accessFailure(res,error))return;
    console.error('announcement-image',error);
    return res.status(500).json({ok:false,error:'ANNOUNCEMENT_IMAGE_FAILED'});
  }
}
