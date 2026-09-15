import {adminDb,previewWriteGuard} from '../server/firebase-admin.js';
import {getStudent,WORKSPACE_ID} from '../server/class-roster.js';

const monthKey=()=>new Date().toISOString().slice(0,7);
const now=()=>new Date().toISOString();
const clampStars=(value)=>Math.max(0,Math.min(30,Number(value)||0));
const jsonBody=(req)=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const eventId=(studentId,delta)=>`manual_star_${delta>0?'plus':'minus'}_${studentId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

export default async function handler(req,res){
  try{
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    previewWriteGuard();
    const body=jsonBody(req);
    const studentId=String(body.studentId||'');
    const delta=Number(body.delta);
    if(!getStudent(studentId))return res.status(404).json({ok:false,error:'STUDENT_NOT_FOUND'});
    if(delta!==1&&delta!==-1)return res.status(400).json({ok:false,error:'STAR_DELTA_INVALID'});

    const db=adminDb();
    const month=monthKey();
    const root=`workspaces/${WORKSPACE_ID}`;
    const ledger=db.doc(`${root}/rewardLedgers/${studentId}_${month}`);
    const id=eventId(studentId,delta);
    const event=db.doc(`${root}/rewardEvents/${id}`);

    const result=await db.runTransaction(async tx=>{
      const snap=await tx.get(ledger);
      const current=snap.exists?clampStars(snap.data()?.stars):0;
      const next=clampStars(current+delta);
      if(next===current)return {stars:current,changed:false};
      tx.set(ledger,{studentId,month,stars:next,updatedAt:now()},{merge:true});
      tx.set(event,{id,studentId,month,stars:delta,kind:'manual_adjustment',createdAt:now()});
      return {stars:next,changed:true};
    });

    return res.status(200).json({ok:true,...result});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==='PRODUCTION_WRITE_BLOCKED'?403:500;
    console.error('star-adjust',message);
    return res.status(status).json({ok:false,error:message});
  }
}
