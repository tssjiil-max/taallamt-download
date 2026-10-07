// Guardian-facing assistant layered on top of the existing message system.
// It never receives another student's data and never writes as the teacher.
import {adminDb} from './firebase-admin.js';
import {PROVIDERS,configured,callAssistantProvider} from './assistant.js';
import {riyadhDateString} from './learning-content.js';
import {workspaceRoot} from './plan.js';
import {buildStudentHome} from './student-home.js';
import {sendAssistantMessage} from './messages.js';

export const GUARDIAN_ASSISTANT_MODES=['off','suggest','auto_routine'];
export const GUARDIAN_ASSISTANT_CLASSIFICATIONS=['routine','needs_clarification','teacher_required','out_of_scope','unsafe'];
export const GUARDIAN_ASSISTANT_INSTRUCTIONS=`أنت «مساعد المعلم» داخل منصة «تعلّمت» للصف الثاني الابتدائي.
مهمتك فقط مساعدة ولي أمر الطالب في المعلومات التعليمية الموجودة في البيانات المرفقة لك.
القواعد الملزمة:
1) استخدم البيانات المرفقة فقط، ولا تخترع واجبًا أو تقييمًا أو موعدًا أو درسًا أو صفحة أو عدد نجوم.
2) لا تذكر أي طالب آخر ولا تطلب اسمه، ولا تكشف ملاحظات المعلم الداخلية أو المتابعة المركزة.
3) لا تصدر حكمًا على الطالب ولا تعد ولي الأمر بإجراء باسم المعلم.
4) الشكاوى والمشكلات السلوكية والتنمر والإصابات والصحة والغياب والأعذار والاعتراضات وطلبات المقابلة أو الاتصال أو الاستثناء والموضوعات الإدارية أو المالية أو الأسرية = teacher_required.
5) إذا لم توجد معلومة مؤكدة = teacher_required، ولا تخمّن.
6) إذا كان السؤال خارج متابعة الطالب والدروس والواجبات والتقييم = out_of_scope.
7) اجعل الرد قصيرًا وواضحًا ومهذبًا.
8) أعد JSON فقط بهذه المفاتيح: classification, reply, confidence, needsTeacherReply.
القيم المسموحة للتصنيف: routine, needs_clarification, teacher_required, out_of_scope, unsafe.
confidence رقم من 0 إلى 1. إذا كنت غير متأكد فاختر teacher_required.`;

const DEFAULT={mode:'auto_routine',provider:'openai',enabled:true};
const THREAD_FALLBACK='وصلت رسالتك، وهذا الموضوع يحتاج متابعة المعلم مباشرة. تم تحويله للمعلم.';
const NO_DATA='لا توجد لدي معلومة مؤكدة مسجلة عن ذلك حاليًا. سأترك رسالتك للمعلم للمتابعة.';
const OUT_OF_SCOPE='أنا مخصص لمتابعة الطالب والدروس والواجبات والتقييم داخل منصة تعلّمت.';
const CLASSES=new Set(GUARDIAN_ASSISTANT_CLASSIFICATIONS);
const settingsRef=()=>adminDb().doc(`${workspaceRoot()}/teacherSettings/guardianAssistant`);
const threadRef=studentId=>adminDb().doc(`${workspaceRoot()}/guardianAssistantThreads/${studentId}`);
const handledRef=messageId=>adminDb().doc(`${workspaceRoot()}/guardianAssistantHandled/${String(messageId).replace(/\//g,'_')}`);
const usageRef=date=>adminDb().doc(`${workspaceRoot()}/guardianAssistantUsage/${riyadhDateString(date)}`);
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const limit=()=>{const n=Number(process.env.GUARDIAN_ASSISTANT_DAILY_LIMIT);return Number.isFinite(n)&&n>0?Math.min(1000,Math.floor(n)):100};

function resultLabel(value){return value==='mastered'?'أتقن':value==='needs_repeat'?'يحتاج إعادة':value==='not_mastered'?'لم يتقن':''}
function subjectKeyOfQuestion(value){
  const q=text(value);
  if(/قرآن|القران|حفظ|سورة/.test(q))return 'quran';
  if(/إملاء|املاء|الخط|خط/.test(q))return 'spelling';
  if(/دراسات|إسلامية|اسلامية|توحيد|فقه/.test(q))return 'islamic';
  if(/لغتي|عربي|العربية|قراءة|نسخ/.test(q))return 'arabic';
  return '';
}
function planItem(home,key){return (home.plan?.items||[]).find(item=>item.subjectKey===key)||null}
function assessmentItem(home,key){return (home.assessment?.items||[]).find(item=>item.subjectKey===key)||null}
function homeworkLine(item){
  const due=item.dueDate?`، والتسليم ${item.dueDate}`:'';
  const state=item.done?' (مكتمل)':'';
  return `${item.subjectLabel||''}: ${item.displayTitle||item.title||item.task||'واجب'}${due}${state}`.trim();
}
function safeContext(home){
  return {
    today:home.today?.date||'',
    week:{number:home.week?.number||null,range:home.week?.range||null},
    plan:(home.plan?.items||[]).map(item=>({subjectKey:item.subjectKey,label:item.label,unit:item.unit||'',lesson:item.lesson||'',skill:item.skill||'',page:item.page||null,holiday:Boolean(item.holiday),days:item.days||[]})),
    homework:{
      today:(home.homework?.today||[]).map(item=>({subjectKey:item.subjectKey,subjectLabel:item.subjectLabel,displayTitle:item.displayTitle,title:item.title,lesson:item.lesson,skill:item.skill,page:item.page,task:item.task,dueDate:item.dueDate,done:Boolean(item.done),status:item.status})),
      pending:(home.homework?.pending||[]).map(item=>({subjectKey:item.subjectKey,subjectLabel:item.subjectLabel,displayTitle:item.displayTitle,title:item.title,lesson:item.lesson,skill:item.skill,page:item.page,task:item.task,dueDate:item.dueDate,done:Boolean(item.done),status:item.status}))
    },
    assessment:(home.assessment?.items||[]).map(item=>({subjectKey:item.subjectKey,label:item.label,week:item.week,skill:item.skill,lesson:item.lesson,status:item.status||null})),
    stars:{count:Number(home.stars?.count)||0,goal:Number(home.stars?.goal)||30},
    quran:home.quran?.current?{week:home.quran.current.week,surah:home.quran.current.surah,range:home.quran.current.range,status:home.quran.current.status||null}:null
  };
}
function sensitive(q){
  return /شكوى|مشكلة|تنمر|ضرب|اعتداء|إصابة|اصابة|مريض|مرض|صحة|دواء|غياب|غائب|عذر|اعتراض|غير راضي|مقابلة|أبغى أكلم|ابغى اكلم|اتصل|اتصال|كلمني|استثناء|مشكلة أسر|اسري|أسرية|رسوم|مالي|مبلغ|طالب آخر|ولد ثاني|معلم آخر|المدير/.test(q);
}
function unsafe(q){return /انتحار|أؤذي|اؤذي|قتل|سلاح|مخدر|ابتزاز/.test(q)}
function outside(q){return /طقس|جو اليوم|مباراة|الاتحاد|هلال|سهم|بورصة|سياسة|سياسي/.test(q)}

function ruleAnswer(question,home){
  const q=text(question),subject=subjectKeyOfQuestion(q);
  if(unsafe(q))return {classification:'unsafe',reply:THREAD_FALLBACK,confidence:1,needsTeacherReply:true};
  if(sensitive(q))return {classification:'teacher_required',reply:THREAD_FALLBACK,confidence:1,needsTeacherReply:true};
  if(outside(q))return {classification:'out_of_scope',reply:OUT_OF_SCOPE,confidence:.99,needsTeacherReply:false};

  if(/كيف.*(استخدم|استعمل)|طريقة.*الصفحة|وين.*(واجب|تقييم|نجوم)/.test(q)){
    return {classification:'routine',reply:'من الصفحة الرئيسية ستجد الخطة الأسبوعية، ثم التقييم، ثم الواجبات، ثم النجوم. ويمكن فتح «عرض التفاصيل» لكل قسم.',confidence:.98,needsTeacherReply:false};
  }
  if(/نجمة|نجوم|رصيد/.test(q)){
    const count=Number(home.stars?.count)||0,goal=Number(home.stars?.goal)||30;
    return {classification:'routine',reply:`رصيد الطالب الحالي ${count} نجمة من ${goal} نجمة.`,confidence:.99,needsTeacherReply:false};
  }
  if(/واجب|واجبات|تسليم/.test(q)){
    const items=home.homework?.today||[];
    if(!items.length)return {classification:'routine',reply:'لا يوجد واجب منشور لليوم في المنصة.',confidence:.99,needsTeacherReply:false};
    const filtered=subject?items.filter(item=>item.subjectKey===subject):items;
    if(subject&&!filtered.length)return {classification:'teacher_required',reply:NO_DATA,confidence:.99,needsTeacherReply:true};
    if(/متى|موعد|تسليم/.test(q)){
      const withDue=filtered.filter(item=>item.dueDate);
      if(!withDue.length)return {classification:'teacher_required',reply:NO_DATA,confidence:.99,needsTeacherReply:true};
      return {classification:'routine',reply:withDue.map(item=>`${item.subjectLabel}: موعد التسليم ${item.dueDate}.`).join(' '),confidence:.99,needsTeacherReply:false};
    }
    return {classification:'routine',reply:`واجب اليوم: ${filtered.map(homeworkLine).join(' — ')}`,confidence:.99,needsTeacherReply:false};
  }
  if(/أتقن|اتقن|تقييم|قيّم|قيم|مستواه/.test(q)){
    if(!subject)return {classification:'needs_clarification',reply:'أي مادة تقصد في التقييم: لغتي، القرآن الكريم، الدراسات الإسلامية، أم الإملاء والخط؟',confidence:.98,needsTeacherReply:false};
    const item=assessmentItem(home,subject),label=resultLabel(item?.status);
    if(!item||!label)return {classification:'teacher_required',reply:NO_DATA,confidence:.99,needsTeacherReply:true};
    return {classification:'routine',reply:`آخر تقييم مسجل في ${item.label}: ${label}.`,confidence:.99,needsTeacherReply:false};
  }
  if(/حفظ|سورة|القرآن|القران/.test(q)){
    const item=planItem(home,'quran');
    if(!item||(!item.lesson&&!item.unit))return {classification:'teacher_required',reply:NO_DATA,confidence:.99,needsTeacherReply:true};
    const parts=[item.unit?`سورة ${item.unit}`:'',item.lesson||''].filter(Boolean).join(' — ');
    return {classification:'routine',reply:`المطلوب في القرآن الكريم هذا الأسبوع: ${parts}.`,confidence:.98,needsTeacherReply:false};
  }
  if(/درس|الخطة|خطة|مهارة|صفحة|وش ندرس|ماذا ندرس/.test(q)){
    if(!subject)return {classification:'needs_clarification',reply:'أي مادة تقصد: لغتي، القرآن الكريم، الدراسات الإسلامية، أم الإملاء والخط؟',confidence:.97,needsTeacherReply:false};
    const item=planItem(home,subject);
    if(!item||item.holiday||(!item.lesson&&!item.skill))return {classification:'teacher_required',reply:NO_DATA,confidence:.99,needsTeacherReply:true};
    const parts=[item.lesson?`الدرس: ${item.lesson}`:'',item.skill?`المهارة: ${item.skill}`:'',item.page?`الصفحة: ${item.page}`:''].filter(Boolean);
    return {classification:'routine',reply:`${item.label}: ${parts.join('، ')}.`,confidence:.98,needsTeacherReply:false};
  }
  return null;
}
function parseModelJson(raw){
  let value=String(raw||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  const start=value.indexOf('{'),end=value.lastIndexOf('}');if(start>=0&&end>start)value=value.slice(start,end+1);
  const parsed=JSON.parse(value),classification=String(parsed.classification||''),confidence=Math.max(0,Math.min(1,Number(parsed.confidence)||0));
  if(!CLASSES.has(classification))throw new Error('GUARDIAN_ASSISTANT_CLASSIFICATION_INVALID');
  const reply=text(parsed.reply).slice(0,1000);
  if(!reply)throw new Error('GUARDIAN_ASSISTANT_REPLY_EMPTY');
  const needsTeacherReply=Boolean(parsed.needsTeacherReply)||classification==='teacher_required'||classification==='unsafe'||confidence<.75;
  return confidence<.75?{classification:'teacher_required',reply:THREAD_FALLBACK,confidence,needsTeacherReply:true}:{classification,reply,confidence,needsTeacherReply};
}
async function modelAnswer(question,home,provider){
  if(!configured(provider))return {classification:'teacher_required',reply:THREAD_FALLBACK,confidence:0,needsTeacherReply:true};
  const input=`<guardian_context>\n${JSON.stringify(safeContext(home))}\n</guardian_context>\n\nسؤال ولي الأمر: ${text(question).slice(0,1000)}`;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const result=await callAssistantProvider({provider,instructions:GUARDIAN_ASSISTANT_INSTRUCTIONS,input,signal:controller.signal});
    return parseModelJson(result.text);
  }finally{clearTimeout(timer)}
}
async function claimUsage(date){
  const ref=usageRef(date),max=limit();
  return adminDb().runTransaction(async tx=>{const snap=await tx.get(ref),count=snap.exists?Number(snap.data()?.count)||0:0;if(count>=max)return {allowed:false,count,max};tx.set(ref,{date:riyadhDateString(date),count:count+1,updatedAt:date.toISOString()},{merge:true});return {allowed:true,count:count+1,max}});
}
async function claimMessage(messageId,date){
  const ref=handledRef(messageId);
  return adminDb().runTransaction(async tx=>{const snap=await tx.get(ref);if(snap.exists)return false;tx.set(ref,{messageId,status:'processing',createdAt:date.toISOString()});return true});
}
async function finish(messageId,outcome,date){
  await handledRef(messageId).set({status:'done',classification:outcome.classification,confidence:outcome.confidence,needsTeacherReply:outcome.needsTeacherReply,finishedAt:date.toISOString()},{merge:true});
}
export async function guardianAssistantSettings(){
  const snap=await settingsRef().get(),raw=snap.exists?snap.data():{},mode=GUARDIAN_ASSISTANT_MODES.includes(raw?.mode)?raw.mode:DEFAULT.mode,provider=PROVIDERS[raw?.provider]?raw.provider:DEFAULT.provider;
  return {mode,provider,enabled:raw?.enabled!==false,limit:limit(),providers:Object.fromEntries(Object.keys(PROVIDERS).map(key=>[key,{label:PROVIDERS[key].label,configured:configured(key)}]))};
}
export async function saveGuardianAssistantSettings(body={}){
  const mode=String(body.mode||''),provider=String(body.provider||'');
  if(mode&&!GUARDIAN_ASSISTANT_MODES.includes(mode))throw new Error('GUARDIAN_ASSISTANT_MODE_INVALID');
  if(provider&&!PROVIDERS[provider])throw new Error('PROVIDER_INVALID');
  const current=await guardianAssistantSettings(),next={mode:mode||current.mode,provider:provider||current.provider,enabled:body.enabled===undefined?current.enabled:Boolean(body.enabled),updatedAt:new Date().toISOString()};
  await settingsRef().set(next,{merge:true});return {saved:true,...next,providers:current.providers,limit:current.limit};
}
export async function guardianAssistantThreadState(studentId){
  const snap=await threadRef(studentId).get(),data=snap.exists?snap.data():{};
  return {studentId,needsTeacherReply:Boolean(data?.needsTeacherReply),suggestedReply:String(data?.suggestedReply||''),assistantHandledMessageId:String(data?.assistantHandledMessageId||''),assistantReplied:Boolean(data?.assistantReplied),lastClassification:String(data?.lastClassification||''),updatedAt:String(data?.updatedAt||'')};
}
export async function markTeacherReplied(studentId,date=new Date()){
  await threadRef(studentId).set({needsTeacherReply:false,suggestedReply:'',assistantReplied:false,teacherRepliedAt:date.toISOString(),updatedAt:date.toISOString()},{merge:true});
  return {saved:true};
}
export async function handleGuardianMessage(studentId,message,date=new Date()){
  const messageId=String(message?.id||'');if(!messageId)return {handled:false};
  if(!(await claimMessage(messageId,date)))return {handled:false,duplicate:true};
  const settings=await guardianAssistantSettings(),baseState={assistantHandledMessageId:messageId,updatedAt:date.toISOString()};
  let outcome={classification:'teacher_required',reply:THREAD_FALLBACK,confidence:0,needsTeacherReply:true},assistantReplied=false,suggestedReply='';
  try{
    if(!settings.enabled||settings.mode==='off'){
      await threadRef(studentId).set({...baseState,needsTeacherReply:true,suggestedReply:'',assistantReplied:false,lastClassification:'teacher_required'},{merge:true});
      await finish(messageId,outcome,date);return {handled:true,mode:settings.mode,...outcome,assistantReplied:false};
    }
    const usage=await claimUsage(date);
    if(!usage.allowed)outcome={classification:'teacher_required',reply:'وصلت رسالتك للمعلم وسيتم الاطلاع عليها.',confidence:1,needsTeacherReply:true};
    else{
      const home=await buildStudentHome(studentId,{date});
      outcome=ruleAnswer(message.text,home)||await modelAnswer(message.text,home,settings.provider);
    }
    if(settings.mode==='suggest'){
      suggestedReply=outcome.classification==='routine'||outcome.classification==='needs_clarification'||outcome.classification==='out_of_scope'?outcome.reply:'';
      await threadRef(studentId).set({...baseState,needsTeacherReply:true,suggestedReply,assistantReplied:false,lastClassification:outcome.classification},{merge:true});
    }else{
      const reply=outcome.reply||THREAD_FALLBACK;
      const sent=await sendAssistantMessage(studentId,reply,messageId,date);assistantReplied=Boolean(sent?.saved);
      await threadRef(studentId).set({...baseState,needsTeacherReply:Boolean(outcome.needsTeacherReply),suggestedReply:'',assistantReplied,lastClassification:outcome.classification,lastAssistantMessageId:String(sent?.message?.id||'')},{merge:true});
    }
    await finish(messageId,outcome,date);
    return {handled:true,mode:settings.mode,...outcome,assistantReplied,suggestedReply};
  }catch(error){
    outcome={classification:'teacher_required',reply:'وصلت رسالتك للمعلم، وسيتم الاطلاع عليها.',confidence:0,needsTeacherReply:true};
    try{
      if(settings.mode==='auto_routine'){const sent=await sendAssistantMessage(studentId,outcome.reply,messageId,date);assistantReplied=Boolean(sent?.saved)}
      await threadRef(studentId).set({...baseState,needsTeacherReply:true,suggestedReply:'',assistantReplied,lastClassification:'teacher_required'},{merge:true});
      await finish(messageId,outcome,date);
    }catch{}
    return {handled:true,mode:settings.mode,...outcome,assistantReplied,error:'FALLBACK'};
  }
}
