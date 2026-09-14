import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const now=()=>new Date().toISOString();
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const refs=[];
  try{
    previewWriteGuard();
    const db=adminDb(),stamp=Date.now(),studentId='__staging_test__',base=root(),month=new Date().toISOString().slice(0,7);
    const ledger=db.doc(`${base}/rewardLedgers/${studentId}_${month}`);refs.push(ledger);
    const reward=db.doc(`${base}/rewardEvents/smoke_reward_${stamp}`);refs.push(reward);
    const assessment=db.doc(`${base}/assessments/smoke_assessment_${stamp}`);refs.push(assessment);
    const behavior=db.doc(`${base}/assessments/smoke_behavior_${stamp}`);refs.push(behavior);
    const communication=db.doc(`${base}/communications/smoke_communication_${stamp}`);refs.push(communication);
    const homework=db.doc(`${base}/homework/smoke_homework_${stamp}`);refs.push(homework);
    const evidence=db.doc(`${base}/homeworkEvidence/smoke_homework_${stamp}_${studentId}`);refs.push(evidence);
    const t=now();
    const batch=db.batch();
    batch.set(ledger,{studentId,month,stars:1,updatedAt:t});
    batch.set(reward,{id:`smoke_reward_${stamp}`,studentId,month,stars:1,kind:'smoke',createdAt:t});
    batch.set(assessment,{id:`smoke_assessment_${stamp}`,studentId,classSessionId:'smoke',sessionDate:t.slice(0,10),enteredAt:t,track:'general',academic:[{targetId:'subject:arabic',result:'mastered'}],behavior:[]});
    batch.set(behavior,{id:`smoke_behavior_${stamp}`,studentId,classSessionId:'smoke',sessionDate:t.slice(0,10),enteredAt:t,track:'general',academic:[],behavior:[{code:'distinguished',label:'متميز',tone:'positive'}]});
    batch.set(communication,{id:`smoke_communication_${stamp}`,studentId,recipient:'guardian',reasonCode:'guardian_message',reason:'رسالة لولي الأمر',summary:'اختبار ربط Staging',createdAt:t,status:'recorded'});
    batch.set(homework,{id:`smoke_homework_${stamp}`,classId:CLASS_ID,subject:'واجب',title:'اختبار Staging',instructions:'اختبار فقط',targetIds:[],assignedAt:t,status:'published',kind:'homework'});
    batch.set(evidence,{id:`smoke_homework_${stamp}_${studentId}`,homeworkId:`smoke_homework_${stamp}`,studentId,status:'assigned',assignedAt:t});
    await batch.commit();
    const snaps=await Promise.all(refs.map(r=>r.get()));
    const checks={star:snaps[0].exists&&snaps[0].data()?.stars===1,rewardEvent:snaps[1].exists,assessment:snaps[2].exists,behavior:snaps[3].exists,communication:snaps[4].exists,homework:snaps[5].exists,homeworkEvidence:snaps[6].exists};
    const cleanup=db.batch();refs.forEach(r=>cleanup.delete(r));await cleanup.commit();
    const deleted=(await Promise.all(refs.map(r=>r.get()))).every(s=>!s.exists);
    return res.status(200).json({ok:Object.values(checks).every(Boolean)&&deleted,environment:process.env.VERCEL_ENV,checks,cleanup:deleted,productionProtected:true});
  }catch(error){
    try{if(refs.length){const db=adminDb(),cleanup=db.batch();refs.forEach(r=>cleanup.delete(r));await cleanup.commit()}}catch{}
    return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});
  }
}
