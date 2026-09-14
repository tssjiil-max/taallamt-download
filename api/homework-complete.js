import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID} from '../server/class-roster.js';

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const studentId=String(body.studentId||''),homeworkId=String(body.homeworkId||'');
    if(!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    if(!homeworkId)return res.status(400).json({ok:false,error:'HOMEWORK_ID_REQUIRED'});
    const db=adminDb(),root=`workspaces/${WORKSPACE_ID}`,evidenceId=`${homeworkId}_${studentId}`,ref=db.doc(`${root}/homeworkEvidence/${evidenceId}`);
    const snap=await ref.get();if(!snap.exists)return res.status(404).json({ok:false,error:'HOMEWORK_NOT_ASSIGNED'});
    const completedAt=new Date().toISOString();
    await ref.set({status:'completed',completedAt,confirmedBy:'guardian'},{merge:true});
    return res.status(200).json({ok:true,studentId,homeworkId,status:'completed',completedAt});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)})}
}
