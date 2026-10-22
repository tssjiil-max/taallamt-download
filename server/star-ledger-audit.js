// Read-only diagnostic: no award, deduction, reset, or migration happens here.
import {adminDb} from './firebase-admin.js';
import {rosterStudent} from './roster.js';
import {workspaceRoot} from './plan.js';

const monthOf=date=>date.toISOString().slice(0,7);
const numeric=value=>Number.isFinite(Number(value))?Number(value):null;
export function summarizeStarAudit({studentId,month,canonical,ledgers=[],events=[]}){
 const same=ledgers.filter(row=>row.studentId===studentId&&row.month===month);
 const relevantEvents=events.filter(row=>row.studentId===studentId&&(row.month===month||String(row.createdAt||'').startsWith(month)));
 const candidates=[...(canonical?.exists?[numeric(canonical.stars)]:[]),...same.map(row=>numeric(row.stars))].filter(v=>v!==null);
 const distinct=[...new Set(candidates)].sort((a,b)=>a-b);
 return {
   studentId,month,canonicalStars:canonical?.exists?numeric(canonical.stars):null,
   candidateBalances:distinct,mismatch:distinct.length>1,
   ledgerRecords:same.map(row=>({id:row.id,stars:numeric(row.stars),updatedAt:row.updatedAt||null})),
   eventNet:relevantEvents.reduce((sum,row)=>sum+(Number(row.stars)||0),0),
   eventCount:relevantEvents.length,
   eventEntries:relevantEvents.map(row=>({id:row.id,stars:numeric(row.stars),kind:row.kind||'',createdAt:row.createdAt||''})).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,150),
   warning:'AUDIT_ONLY_NO_BALANCE_CHANGES'
 };
}
const rows=snap=>snap.docs.map(d=>({id:d.id,...d.data()}));
export async function readStarLedgerAudit(studentId,date=new Date()){
 const student=rosterStudent(studentId);
 if(!student)throw new Error('STUDENT_NOT_FOUND');
 const month=monthOf(date),db=adminDb(),root=workspaceRoot();
 const [canonical,ledgers,events]=await Promise.all([
  db.doc(`${root}/rewardLedgers/${studentId}_${month}`).get(),
  db.collection(`${root}/rewardLedgers`).where('studentId','==',studentId).get(),
  db.collection(`${root}/rewardEvents`).where('studentId','==',studentId).get()
 ]);
 const report=summarizeStarAudit({studentId,month,canonical:canonical.exists?{exists:true,...canonical.data()}:{exists:false},ledgers:rows(ledgers),events:rows(events)});
 return {ok:true,student:{id:student.id,name:student.name},...report,
  allMonths:rows(ledgers).map(x=>({id:x.id,month:x.month||'',stars:numeric(x.stars)})),
  // An audit intentionally never guesses that the largest value is the correct balance.
 };
}
