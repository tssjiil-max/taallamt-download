import {adminDb} from './firebase-admin.js';
import {requirePilot} from './learning-pilot.js';
import {requireStudentAccess,AccessError} from './access.js';
import {workspaceRoot} from './plan.js';
import {riyadhDateString} from './learning-content.js';
import {foundationCatalog} from './foundation-content.js';
import {dailyLessons,gradeSelfTest} from './daily-lessons.js';
const rows=s=>s.docs.map(d=>({id:d.id,...d.data()}));
const settingsRef=()=>adminDb().doc(workspaceRoot()+'/settings/dailyLearning');
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,100}$/.test(x);
export async function dailyContext(studentId,date=new Date(),teacher=false){
 const db=adminDb(),base=workspaceRoot();
 const [plans,targets,settings,profile]=await Promise.all([db.collection(base+'/weeklyPlans').where('publishStatus','==','published').get(),db.collection(base+'/curriculumTargets').get(),settingsRef().get(),db.doc(base+'/studentProfiles/'+studentId).get()]);
 const catalog=foundationCatalog(rows(targets)),memory=profile.data()?.learningPilotMemory||{},config=settings.data()||{};
 return {catalog,memory,settings:config,projection:dailyLessons({plans:rows(plans),catalog,settings:config,memory,date,teacher})};
}
export async function dailyRead(req,res){
 requirePilot();const studentId=String(req.query.studentId||'');await requireStudentAccess(req,studentId,null);
 const context=await dailyContext(studentId);
 const {gaps,...safe}=context.projection;
 return res.status(200).json({ok:true,...safe});
}
export async function dailyWrite(req,res,body){
 requirePilot();const studentId=String(body.studentId||'');await requireStudentAccess(req,studentId,body,{write:true});
 if(!validId(body.attemptId)||body.attemptId.length>70)throw new AccessError('ID_INVALID',400);
 const context=await dailyContext(studentId),lesson=context.projection.lessons.find(l=>l.id===body.lessonId);
 if(!lesson?.targetId)throw new AccessError('CONTENT_NOT_AVAILABLE',404);
 const db=adminDb(),base=workspaceRoot(),profile=db.doc(base+'/studentProfiles/'+studentId),journal=db.doc(profile.path+'/dailySelfTests/'+body.attemptId);
 const result=await db.runTransaction(async tx=>{
  const [p,j,source,config,plan]=await Promise.all([tx.get(profile),tx.get(journal),tx.get(db.doc(base+'/curriculumTargets/'+lesson.targetId)),tx.get(settingsRef()),tx.get(db.doc(base+'/weeklyPlans/'+lesson.id.replace(/:d[0-4]$/,'')))]);
  if(j.exists){if(j.data().lessonId!==body.lessonId)throw new AccessError('ATTEMPT_CONFLICT',409);return {...j.data(),duplicate:true}}
  const settings=config.data()||{};
  const recheck=dailyLessons({plans:plan.exists?[{...plan.data(),id:plan.id}]:[],catalog:context.catalog,settings,memory:p.data()?.learningPilotMemory||{}}).lessons.find(l=>l.id===lesson.id);
  if(!recheck?.targetId||recheck.targetId!==lesson.targetId)throw new AccessError('CONTENT_CHANGED',409);
  if(settings.enabled===false||settings.overrides?.[lesson.id]?.hidden||settings.overrides?.[lesson.id]?.date>context.projection.date)throw new AccessError('CONTENT_NOT_AVAILABLE',404);
  const target=context.catalog.find(t=>t.id===lesson.targetId);
  if(!source.exists||source.data().learning?.status!=='approved'||JSON.stringify(source.data().learning)!==JSON.stringify(target?.learning))throw new AccessError('CONTENT_CHANGED',409);
  const memory=p.data()?.learningPilotMemory||{};
  if((memory.selfTests||[]).filter(t=>riyadhDateString(new Date(t.at))===context.projection.date).length>=10)throw new AccessError('DAILY_LIMIT_REACHED',429);
  const graded=gradeSelfTest(memory,{id:body.attemptId,lessonId:lesson.id,target,answers:body.answers},new Date().toISOString());
  tx.set(profile,{learningPilotMemory:graded.memory},{merge:true});tx.set(journal,graded.result);
  tx.set(db.doc(base+'/portfolioEvents/daily_'+studentId+'_'+body.attemptId),{studentId,type:'improvement',summary:'اختبار ذاتي: '+lesson.title+' — '+graded.result.correct+'/'+graded.result.total,occurredAt:graded.result.at,source:'daily-learning',official:false});
  return graded.result;
 });
 return res.status(200).json({ok:true,...result});
}
export async function dailyTeacherRead(query){requirePilot();const context=await dailyContext(String(query.studentId||'__preview__'),new Date(),true);return {ok:true,settings:context.settings,results:context.memory.selfTests||[],...context.projection}}
export async function dailyTeacherWrite(body){
 requirePilot();const ref=settingsRef();
 if(body.holidays!==undefined){if(!Array.isArray(body.holidays)||body.holidays.length>100||body.holidays.some(d=>typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d)||Number.isNaN(Date.parse(d+'T00:00:00Z'))))throw new AccessError('DATE_INVALID',400);await ref.set({holidays:[...new Set(body.holidays)]},{merge:true})}
 if(body.enabled!==undefined){if(typeof body.enabled!=='boolean')throw new AccessError('SETTING_INVALID',400);await ref.set({enabled:body.enabled},{merge:true})}
 if(body.lessonId){if(!validId(body.lessonId))throw new AccessError('ID_INVALID',400);const date=String(body.date||'');if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))throw new AccessError('DATE_INVALID',400);await adminDb().runTransaction(async tx=>{const s=await tx.get(ref);const overrides={...(s.data()?.overrides||{}),[body.lessonId]:{...(date?{date}:{}),hidden:body.hidden===true}};tx.set(ref,{overrides},{merge:true})})}
 return {ok:true};
}
