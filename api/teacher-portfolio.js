import {adminDb} from '../server/firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const studentMap=new Map(CLASS_STUDENTS.map(student=>[student.id,student.name]));
const dateOf=(item)=>String(item.enteredAt||item.startedAt||item.createdAt||item.assignedAt||item.occurredAt||item.updatedAt||'');
const ref=(id,title,sourceType,sourceId,occurredAt,section,meta={})=>({id,title,sourceType,sourceId,occurredAt:occurredAt||'',section,...meta});

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const db=adminDb(),base=root();
    const [weekly,assessments,remediation,communications,homework,files,portfolio,rewards]=await Promise.all([
      db.collection(`${base}/weeklyPlans`).get(),db.collection(`${base}/assessments`).get(),db.collection(`${base}/remediationPlans`).get(),db.collection(`${base}/communications`).get(),db.collection(`${base}/homework`).get(),db.collection(`${base}/files`).get(),db.collection(`${base}/portfolioEvents`).get(),db.collection(`${base}/rewardEvents`).get()
    ]);
    const evidence=[];
    for(const item of rows(weekly).filter(x=>x.publishStatus==='published'))evidence.push(ref(`wp:${item.id}`,`الخطة الأسبوعية — ${item.title||item.subject||''}`, 'weekly_plan',item.id,dateOf(item),'التوزيع والمنهج',{weekKey:item.weekKey,unit:item.unit,lesson:item.lesson}));
    for(const item of rows(assessments))evidence.push(ref(`as:${item.id}`,`تقييم ${studentMap.get(item.studentId)||item.studentId||''}`,'assessment',item.id,dateOf(item),'الاختبارات وأدوات التقويم',{studentId:item.studentId,academicCount:Array.isArray(item.academic)?item.academic.length:0}));
    for(const item of rows(remediation))evidence.push(ref(`rp:${item.id}`,`خطة علاجية — ${studentMap.get(item.studentId)||item.studentId||''}`,'remediation',item.id,dateOf(item),'الخطة العلاجية',{studentId:item.studentId,status:item.status,summary:item.summary||''}));
    for(const item of rows(communications))evidence.push(ref(`co:${item.id}`,`${item.reason||'تواصل'} — ${studentMap.get(item.studentId)||item.studentId||''}`,'communication',item.id,dateOf(item),'التواصل مع أولياء الأمور',{status:item.status}));
    for(const item of rows(homework))evidence.push(ref(`hw:${item.id}`,item.title||'واجب أو تدريب','homework',item.id,dateOf(item),'أوراق العمل والواجبات',{subject:item.subject,source:item.source}));
    for(const item of rows(files)){
      if(item.visibility==='teacher'||item.category==='teacher-portfolio')evidence.push(ref(`fi:${item.id}`,item.title||item.name||'شاهد مرفوع','file',item.id,dateOf(item),item.portfolioSection||'الشواهد الرقمية',{category:item.category,note:item.note||'',downloadUrl:`/api/library-files?action=download&id=${encodeURIComponent(item.id)}&role=teacher`}));
    }
    for(const item of rows(portfolio))evidence.push(ref(`pe:${item.id}`,item.summary||'شاهد إنجاز','achievement',item.id,dateOf(item),'سجلات المتابعة والإنجاز',{studentId:item.studentId,type:item.type}));
    for(const item of rows(rewards))evidence.push(ref(`re:${item.id}`,`تحفيز ${studentMap.get(item.studentId)||item.studentId||''}`,'achievement',item.id,dateOf(item),'التحفيز والطلاب المتفوقون',{studentId:item.studentId,stars:item.stars||1}));
    evidence.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt)));
    const sections={};for(const item of evidence)(sections[item.section]??=[]).push(item);
    return res.status(200).json({ok:true,teacher:{name:'سلطان الصاعدي',school:'مدرسة عمرو بن أوس الثقفي',className:'الثاني / 4',term:'الفصل الدراسي الأول 1448هـ'},counts:{total:evidence.length,weeklyPlans:weekly.size,assessments:assessments.size,remediation:remediation.size,communications:communications.size,homework:homework.size,manualFiles:rows(files).filter(x=>x.visibility==='teacher'||x.category==='teacher-portfolio').length},sections,evidence});
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
