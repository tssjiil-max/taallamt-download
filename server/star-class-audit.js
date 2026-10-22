// Pure read-only reconciliation; never infer a correct balance or write to Firestore.
const numeric=value=>Number.isFinite(Number(value))?Number(value):null;
export function compareClassBalances({roster,month,canonical=[],ledgers=[],events=[]}){
 const students=roster.map(student=>{
  const id=student.id,doc=canonical.find(x=>x.id===id+'_'+month);
  const current=doc?.exists?numeric(doc.stars):null;
  const matching=ledgers.filter(x=>x.studentId===id&&x.month===month);
  const values=[...(current!==null?[current]:[]),...matching.map(x=>numeric(x.stars)).filter(x=>x!==null)];
  const candidateBalances=[...new Set(values)].sort((a,b)=>a-b);
  const ev=events.filter(x=>x.studentId===id&&(x.month===month||String(x.createdAt||'').startsWith(month)));
  const eventNet=ev.reduce((sum,x)=>sum+(Number(x.stars)||0),0);
  const status=candidateBalances.length>1?'CONFLICT_REQUIRES_EVIDENCE':ev.length&&current!==null&&eventNet!==current?'EVENTS_REQUIRE_REVIEW':current===null?'MISSING_CANONICAL':'NO_CONFLICT';
  return {studentId:id,name:student.name,canonicalStars:current,candidateBalances,eventNet,eventCount:ev.length,status,ledgerIds:matching.map(x=>x.id)};
 });
 return {month,students,conflicts:students.filter(x=>x.status!=='NO_CONFLICT').length,safeToRestoreAutomatically:false,mode:'READ_ONLY'};
}