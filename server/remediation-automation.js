import {adminDb,previewWriteGuard} from './firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID} from './class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const supportResult=(value)=>value==='needs_practice'||value==='not_mastered';
const safeId=(value)=>String(value||'').replace(/[^a-zA-Z0-9:_-]/g,'_');

export async function remediationSuggestions(){
  const db=adminDb();
  const [assessments,targets,plans]=await Promise.all([
    db.collection(`${root()}/assessments`).get(),
    db.collection(`${root()}/curriculumTargets`).get(),
    db.collection(`${root()}/remediationPlans`).get()
  ]);
  const targetMap=new Map(rows(targets).map(item=>[item.id,item]));
  const activePlans=rows(plans).filter(item=>['active','improved','needs_more_support'].includes(item.status));
  const studentMap=new Map(CLASS_STUDENTS.map(student=>[student.id,student]));
  const grouped=new Map();
  const ordered=rows(assessments).sort((a,b)=>String(a.enteredAt||a.sessionDate||'').localeCompare(String(b.enteredAt||b.sessionDate||'')));
  for(const row of ordered){
    if(!studentMap.has(row.studentId))continue;
    for(const item of Array.isArray(row.academic)?row.academic:[]){
      const key=`${row.studentId}|${item.targetId}`,current=grouped.get(key)||{studentId:row.studentId,targetId:item.targetId,count:0,lastResult:null,lastAt:null};
      if(item.result==='mastered')current.count=0;else if(supportResult(item.result))current.count+=1;
      current.lastResult=item.result;current.lastAt=row.enteredAt||row.sessionDate||'';grouped.set(key,current);
    }
  }
  return [...grouped.values()].filter(item=>item.count>0).map(item=>{
    const student=studentMap.get(item.studentId),target=targetMap.get(item.targetId)||{};
    const active=activePlans.find(plan=>plan.studentId===item.studentId&&plan.targetId===item.targetId);
    return {...item,studentName:student?.name||student?.fullName||item.studentId,title:target.title||item.targetId,unit:target.unit||'',skill:target.skill||'',subject:target.subject||'',readyForPlan:item.count>=3,activePlanId:active?.id||null};
  }).sort((a,b)=>b.count-a.count||String(b.lastAt).localeCompare(String(a.lastAt)));
}

export async function syncRemediationPlans(){
  previewWriteGuard();
  const suggestions=await remediationSuggestions(),db=adminDb(),timestamp=new Date().toISOString(),created=[];
  for(const item of suggestions.filter(x=>x.readyForPlan&&!x.activePlanId)){
    const id=`auto-remediation:${safeId(item.studentId)}:${safeId(item.targetId)}`,record={id,studentId:item.studentId,targetId:item.targetId,trigger:'three_needs_support',status:'active',startedAt:timestamp,source:'automation',supportCount:item.count,summary:`خطة علاجية تلقائية في ${item.skill||item.title}: تدريب قصير متدرج، مثال محلول، ثم إعادة تقييم.`};
    await db.doc(`${root()}/remediationPlans/${id}`).set(record,{merge:true});created.push(record);
  }
  return {saved:true,createdCount:created.length,created,suggestionsCount:suggestions.length};
}
