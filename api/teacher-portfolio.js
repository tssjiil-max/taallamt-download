import {adminDb} from '../server/firebase-admin.js';
import {CLASS_STUDENTS,WORKSPACE_ID} from '../server/class-roster.js';

const root=()=>`workspaces/${WORKSPACE_ID}`;
const rows=(snap)=>snap.docs.map(doc=>({id:doc.id,...doc.data()}));
const dateOf=(item)=>String(item.enteredAt||item.startedAt||item.createdAt||item.assignedAt||item.occurredAt||item.updatedAt||'');
const clampPercent=(value)=>Math.max(0,Math.min(100,Math.round(Number(value)||0)));
const pct=(part,total)=>total?clampPercent((part/total)*100):0;
const professionalSectionTitles=[
  'الهوية المهنية',
  'الأهداف المهنية',
  'التخطيط للتعلم',
  'تنفيذ التدريس والأنشطة',
  'التقويم ونواتج التعلم',
  'الفروق الفردية والخطط العلاجية',
  'التواصل مع الأسرة',
  'التحفيز والإنجاز',
  'التطوير المهني والمجتمع المهني',
  'المبادرات والمشروعات',
  'ملخص الأثر'
];
const evidence=(id,title,sourceType,sourceId,occurredAt,section,meta={})=>({id,title,sourceType,sourceId,occurredAt:occurredAt||'',section,...meta});
const safeSection=(value)=>professionalSectionTitles.includes(value)?value:'المبادرات والمشروعات';
const categorySection=(item)=>{
  if(item.category==='weekly'||item.category==='books')return 'التخطيط للتعلم';
  if(item.category==='worksheets'||item.category==='spelling')return 'تنفيذ التدريس والأنشطة';
  if(item.category==='assessments')return 'التقويم ونواتج التعلم';
  if(item.category==='remediation')return 'الفروق الفردية والخطط العلاجية';
  if(item.category==='teacher-portfolio')return safeSection(item.portfolioSection);
  return 'المبادرات والمشروعات';
};

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const db=adminDb(),base=root();
    const [weekly,assessments,remediation,communications,homework,files,portfolio,rewards,curriculum]=await Promise.all([
      db.collection(`${base}/weeklyPlans`).get(),
      db.collection(`${base}/assessments`).get(),
      db.collection(`${base}/remediationPlans`).get(),
      db.collection(`${base}/communications`).get(),
      db.collection(`${base}/homework`).get(),
      db.collection(`${base}/files`).get(),
      db.collection(`${base}/portfolioEvents`).get(),
      db.collection(`${base}/rewardEvents`).get(),
      db.collection(`${base}/curriculumTargets`).get()
    ]);

    const weeklyRows=rows(weekly).filter(x=>x.publishStatus==='published');
    const assessmentRows=rows(assessments);
    const remediationRows=rows(remediation);
    const communicationRows=rows(communications);
    const homeworkRows=rows(homework);
    const fileRows=rows(files);
    const portfolioRows=rows(portfolio);
    const rewardRows=rows(rewards);
    const curriculumRows=rows(curriculum);

    let mastered=0,needsPractice=0,notMastered=0,academicItems=0,behaviorFollowup=0;
    const assessedStudents=new Set();
    for(const row of assessmentRows){
      if(row.studentId)assessedStudents.add(row.studentId);
      for(const item of Array.isArray(row.academic)?row.academic:[]){
        academicItems++;
        if(item.result==='mastered')mastered++;
        else if(item.result==='needs_practice')needsPractice++;
        else if(item.result==='not_mastered')notMastered++;
      }
      behaviorFollowup+=(Array.isArray(row.behavior)?row.behavior:[]).filter(item=>item?.code==='needs_followup').length;
    }
    const masteryRate=pct(mastered,academicItems);
    const remediationResolved=remediationRows.filter(item=>['improved','mastered','completed','closed'].includes(String(item.status||''))).length;
    const remediationResolvedRate=pct(remediationResolved,remediationRows.length);
    const publishedWeeks=new Set(weeklyRows.map(item=>item.weekKey).filter(Boolean));
    const starsAwarded=rewardRows.reduce((sum,item)=>sum+Math.max(0,Number(item.stars)||0),0);
    const manualPortfolioFiles=fileRows.filter(item=>item.category==='teacher-portfolio');

    const professionalGoals=[
      {id:'goal-mastery',title:'رفع إتقان المهارات الأساسية',target:'90% فأعلى',current:academicItems?`${masteryRate}%`:'يبدأ القياس بعد إدخال التقييمات',progress:academicItems?masteryRate:0,source:'التقييمات الأكاديمية'},
      {id:'goal-remediation',title:'تحسين نواتج الطلاب المتعثرين',target:'تحسن موثق لكل خطة علاجية',current:remediationRows.length?`${remediationResolved} من ${remediationRows.length} خطة تحسنت`:'لا توجد خطط مسجلة بعد',progress:remediationResolvedRate,source:'الخطط العلاجية وإعادة التقييم'},
      {id:'goal-planning',title:'استمرار التخطيط الأسبوعي المرتبط بالمنهج',target:'خطة أسبوعية موثقة لكل أسبوع تدريس',current:`${publishedWeeks.size} أسبوعًا موثقًا`,progress:null,source:'الخطط الأسبوعية والتوزيع'},
      {id:'goal-family',title:'تعزيز التواصل التربوي مع الأسرة',target:'توثيق التواصل المرتبط بالمتابعة والتعلم',current:`${communicationRows.length} عملية تواصل موثقة`,progress:null,source:'سجل التواصل'}
    ];

    const evidenceRows=[];
    for(const item of weeklyRows)evidenceRows.push(evidence(`wp:${item.id}`,`خطة أسبوعية موثقة — ${item.title||item.subject||''}`,'weekly_plan',item.id,dateOf(item),'التخطيط للتعلم',{weekKey:item.weekKey,unit:item.unit,lesson:item.lesson}));
    for(const item of homeworkRows)evidenceRows.push(evidence(`hw:${item.id}`,item.title||'نشاط أو واجب تعليمي','homework',item.id,dateOf(item),'تنفيذ التدريس والأنشطة',{subject:item.subject,source:item.source}));
    for(const item of assessmentRows)evidenceRows.push(evidence(`as:${item.id}`,'تقييم أكاديمي موثق','assessment',item.id,dateOf(item),'التقويم ونواتج التعلم',{academicCount:Array.isArray(item.academic)?item.academic.length:0,studentId:item.studentId}));
    for(const item of remediationRows)evidenceRows.push(evidence(`rp:${item.id}`,'خطة علاجية فردية موثقة','remediation',item.id,dateOf(item),'الفروق الفردية والخطط العلاجية',{status:item.status,studentId:item.studentId}));
    for(const item of communicationRows)evidenceRows.push(evidence(`co:${item.id}`,item.reason||'تواصل تربوي موثق','communication',item.id,dateOf(item),'التواصل مع الأسرة',{status:item.status,studentId:item.studentId}));
    for(const item of rewardRows)evidenceRows.push(evidence(`re:${item.id}`,'شاهد تحفيز وتعزيز إيجابي','achievement',item.id,dateOf(item),'التحفيز والإنجاز',{stars:item.stars||1,studentId:item.studentId}));
    for(const item of portfolioRows)evidenceRows.push(evidence(`pe:${item.id}`,'شاهد متابعة أو إنجاز طلابي','achievement',item.id,dateOf(item),'التحفيز والإنجاز',{type:item.type,studentId:item.studentId}));
    for(const item of fileRows){
      if(item.visibility==='teacher'||item.category==='teacher-portfolio')evidenceRows.push(evidence(`fi:${item.id}`,item.title||item.name||'شاهد مرفوع من المعلم','file',item.id,dateOf(item),categorySection(item),{category:item.category,note:item.note||'',manual:true,downloadUrl:`/api/library-files?action=download&id=${encodeURIComponent(item.id)}&role=teacher`}));
    }
    evidenceRows.sort((a,b)=>String(b.occurredAt).localeCompare(String(a.occurredAt)));

    const sections={};
    for(const title of professionalSectionTitles)sections[title]=[];
    for(const item of evidenceRows)(sections[item.section]??=[]).push(item);

    const teacher={
      name:'سلطان الصاعدي',
      school:'مدرسة عمرو بن أوس الثقفي',
      role:'معلم الصف الثاني الابتدائي',
      className:'الثاني / 4',
      term:'الفصل الدراسي الأول 1448هـ',
      subjects:['لغتي','القرآن الكريم','الدراسات الإسلامية','الإملاء والخط'],
      professionalVision:'تعلم منظم وآمن يرفع إتقان المهارات ويجعل المتابعة والتقويم جزءًا من التعلم اليومي.',
      professionalMission:'تخطيط تعلم مرتبط بالمنهج، وتقويم مستمر، ومعالجة مبكرة للتعثر، وتواصل تربوي موثق مع الأسرة.'
    };

    const impactSummary={
      masteryRate,
      mastered,
      needsPractice,
      notMastered,
      academicItems,
      studentsAssessed:assessedStudents.size,
      totalStudents:CLASS_STUDENTS.length,
      remediationPlans:remediationRows.length,
      remediationResolved,
      remediationResolvedRate,
      publishedWeeks:publishedWeeks.size,
      homeworkActivities:homeworkRows.length,
      communications:communicationRows.length,
      starsAwarded,
      behaviorFollowup,
      curriculumTargets:curriculumRows.length,
      manualEvidence:manualPortfolioFiles.length,
      narrative:`يوثق الملف ${assessmentRows.length} سجل تقييم، و${weeklyRows.length} عنصر تخطيط أسبوعي، و${remediationRows.length} خطة علاجية، و${communicationRows.length} عملية تواصل تربوي. نسبة الإتقان الحالية للمهارات المقيمة ${masteryRate}%.`
    };

    const professionalSections=professionalSectionTitles.map((title,index)=>({
      id:`section-${index+1}`,
      title,
      description:(
        title==='الهوية المهنية'?'بيانات المعلم ورؤيته ورسالة ممارسته التعليمية.':
        title==='الأهداف المهنية'?'أهداف قابلة للقياس تتحدث تلقائيًا من بيانات النظام.':
        title==='التخطيط للتعلم'?'التوزيع والمنهج والخطط الأسبوعية والربط بين الوحدة والدرس والمهارة.':
        title==='تنفيذ التدريس والأنشطة'?'الواجبات والأنشطة وأوراق العمل والممارسات التطبيقية.':
        title==='التقويم ونواتج التعلم'?'التقييمات وقراءة نتائج الإتقان ومؤشرات التقدم.':
        title==='الفروق الفردية والخطط العلاجية'?'شواهد تشخيص التعثر والتدخل العلاجي وإعادة التقييم.':
        title==='التواصل مع الأسرة'?'توثيق التواصل المرتبط بتعلم الطالب ومتابعته.':
        title==='التحفيز والإنجاز'?'شواهد التعزيز والنجوم والإنجازات والمتابعة الإيجابية.':
        title==='التطوير المهني والمجتمع المهني'?'الدورات والشهادات واللقاءات والمجتمعات المهنية التي يضيفها المعلم.':
        title==='المبادرات والمشروعات'?'المبادرات والأنشطة والمشروعات والشواهد الإضافية.':
        'ملخص رقمي للأثر مبني على بيانات العمل الفعلية داخل النظام.'
      ),
      evidenceCount:(sections[title]||[]).length
    }));

    return res.status(200).json({
      ok:true,
      generatedAt:new Date().toISOString(),
      teacher,
      professionalGoals,
      impactSummary,
      professionalSections,
      counts:{
        total:evidenceRows.length,
        weeklyPlans:weeklyRows.length,
        assessments:assessmentRows.length,
        remediation:remediationRows.length,
        communications:communicationRows.length,
        homework:homeworkRows.length,
        manualFiles:manualPortfolioFiles.length
      },
      sections,
      evidence:evidenceRows
    });
  }catch(error){return res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});}
}
