import {adminDb} from '../server/firebase-admin.js';
import {WORKSPACE_ID,CLASS_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const safe=(value)=>JSON.parse(JSON.stringify(value));

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const db=adminDb(),base=root();
    const [timetable,curriculum,weeklyPlans,files,homework]=await Promise.all([
      db.collection(`${base}/timetable`).get(),
      db.collection(`${base}/curriculumTargets`).get(),
      db.collection(`${base}/weeklyPlans`).get(),
      db.collection(`${base}/files`).get(),
      db.collection(`${base}/homework`).get(),
    ]);
    const timetableRows=rows(timetable).filter(item=>!item.classId||item.classId===CLASS_ID);
    const curriculumRows=rows(curriculum);
    const weeklyRows=rows(weeklyPlans).sort((a,b)=>String(b.weekKey||'').localeCompare(String(a.weekKey||'')));
    const fileRows=rows(files);
    const homeworkRows=rows(homework).sort((a,b)=>String(b.assignedAt||'').localeCompare(String(a.assignedAt||'')));
    return res.status(200).json({
      ok:true,workspaceId:WORKSPACE_ID,classId:CLASS_ID,
      counts:{timetable:timetableRows.length,curriculum:curriculumRows.length,weeklyPlans:weeklyRows.length,files:fileRows.length,homework:homeworkRows.length},
      timetable:safe(timetableRows.slice(0,40)),
      curriculum:safe(curriculumRows.slice(0,80)),
      weeklyPlans:safe(weeklyRows.slice(0,40)),
      files:safe(fileRows.slice(0,30).map(({contentBase64,...item})=>item)),
      homework:safe(homeworkRows.slice(0,20)),
    });
  }catch(error){
    return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});
  }
}
