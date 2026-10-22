// Explicit teacher-only diagnostic, not called by student pages or background jobs.
import {adminDb} from './firebase-admin.js';
import {workspaceRoot} from './plan.js';
import {ROSTER} from './roster.js';
import {compareClassBalances} from './star-class-audit.js';

export async function readClassStarAudit(date=new Date()){
 const month=date.toISOString().slice(0,7),root=workspaceRoot(),db=adminDb();
 const refs=ROSTER.map(student=>db.doc(`${root}/rewardLedgers/${student.id}_${month}`));
 const [canonical,ledgerSnapshot,eventSnapshot]=await Promise.all([
  db.getAll(...refs),
  db.collection(`${root}/rewardLedgers`).where('month','==',month).get(),
  db.collection(`${root}/rewardEvents`).where('month','==',month).get()
 ]);
 const result=compareClassBalances({
  roster:ROSTER,month,
  canonical:canonical.map((snap,i)=>({id:refs[i].id,exists:snap.exists,...(snap.exists?snap.data():{})})),
  ledgers:ledgerSnapshot.docs.map(s=>({id:s.id,...s.data()})),
  events:eventSnapshot.docs.map(s=>({id:s.id,...s.data()}))
 });
 return {ok:true,...result,warnings:['This is a read-only diagnostic. Month-filtered reward events may be incomplete if legacy events omitted month.','Do not restore balances without a verified historical backup or independently reconciled event history.']};
}