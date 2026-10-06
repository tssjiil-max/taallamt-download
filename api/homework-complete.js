import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID} from '../server/class-roster.js';
import {gradeHomeworkAnswer,gradingSecretFromEnv} from '../server/homework-autograde.js';
import {accessFailure,requireStudentAccess} from '../server/access.js';

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=(typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body)||{};
    const studentId=String(body.studentId||''),homeworkId=String(body.homeworkId||'');
    if(!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    if(!homeworkId||homeworkId.includes('/'))return res.status(400).json({ok:false,error:'HOMEWORK_ID_REQUIRED'});
    // The student's "done" mark is an acknowledgement, not an assessment: it never grants «أتقن» and never changes stars.
    const role=await requireStudentAccess(req,studentId,body,{write:true});
    const db=adminDb(),root=`workspaces/${WORKSPACE_ID}`,evidenceId=`${homeworkId}_${studentId}`,ref=db.doc(`${root}/homeworkEvidence/${evidenceId}`),homeworkRef=db.doc(`${root}/homework/${homeworkId}`);
    const [snap,homeworkSnap]=await Promise.all([ref.get(),homeworkRef.get()]);
    if(!snap.exists)return res.status(404).json({ok:false,error:'HOMEWORK_NOT_ASSIGNED'});
    if(!homeworkSnap.exists)return res.status(404).json({ok:false,error:'HOMEWORK_NOT_FOUND'});
    const submittedAt=new Date().toISOString();
    if(Object.prototype.hasOwnProperty.call(body,'answer')){
      const answer=String(body.answer||'').trim();if(!answer)return res.status(400).json({ok:false,error:'ANSWER_REQUIRED'});
      if(answer.length>2000)return res.status(400).json({ok:false,error:'ANSWER_TOO_LONG'});
      const homework=homeworkSnap.data()||{},grade=gradeHomeworkAnswer({answer,config:homework.autoGrading||null,secret:gradingSecretFromEnv()});
      const attempts=Math.max(0,Number(snap.data()?.attempts)||0)+1;
      const patch={status:grade.status,submissionText:answer,submittedAt,attempts,score:grade.score,maxScore:grade.maxScore,correct:grade.correct,autoFeedback:grade.feedback,gradingMode:grade.mode,requiresTeacherReview:grade.requiresTeacherReview};
      if(grade.correct===true){patch.completedAt=submittedAt;patch.confirmedBy='auto_grader'}
      await ref.set(patch,{merge:true});
      return res.status(200).json({ok:true,studentId,homeworkId,status:grade.status,grade,attempts,submittedAt});
    }
    if(body.undo===true){
      if(snap.data()?.teacherApprovedAt)return res.status(409).json({ok:false,error:'HOMEWORK_ALREADY_APPROVED'});
      await ref.set({status:'assigned',completedAt:null,confirmedBy:null},{merge:true});
      return res.status(200).json({ok:true,studentId,homeworkId,status:'assigned'});
    }
    const completedAt=submittedAt;
    await ref.set({status:'completed',completedAt,confirmedBy:role==='teacher'?'teacher':'guardian'},{merge:true});
    return res.status(200).json({ok:true,studentId,homeworkId,status:'completed',completedAt});
  }catch(error){if(accessFailure(res,error))return;return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)})}
}
