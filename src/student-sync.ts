import {doc,onSnapshot} from 'firebase/firestore';
import {firebaseDb,isFirebaseConfigured} from './adapters/firebase/client';
import {FirestoreLearningRepository} from './adapters/firebase/firestore-repositories';
import {FirestoreRewardRepository} from './adapters/firebase/reward-repository';
import {saveComprehensiveAssessment} from './application/save-comprehensive-assessment';
import type {BehaviorItem,ComprehensiveAssessment,Mastery} from './core/domain';

const WORKSPACE_ID=(import.meta.env.VITE_WORKSPACE_ID as string|undefined)||'second-4';
const STUDENTS=[
 'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','أنس احمد عبدالله الجهني','أوس نايف بن حمد الشريف','أويس عادل فيصل المالكي','تميم ماجد جابر الحجلي','ثامر عبدالله رجاء العوفي','راكان حاتم مهل الجهني','ريان محمود - باري','سلطان فهد زعل الجهني','شامخ بدر لافي الجهني','عادل غالب عبدالله العنزي','عبدالجليل سالم محمود عبدالجليل','عبدالرحمن نواف هندي الحازمي','عمر حميد بن سليم العروي','فيصل محمد عويض المطيري','قصي عبدالله ظاهر الحجلي','كنان محمد عبدالعزيز اليوسفي','محمد سماح سعد البوق','محمد صالح حمد عواد','موسى رياض صالح الأحمد','نايف احمد صويدر الجهني','نواف مطلق صالح العمري','وائل محمد حسين روزي','وسام سلطان عبيد السناني','يمان احمد بن عايد الجهني','يوسف فلاح خلف الحربي','يوسف محمد لافي الجهني'
].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name,grade:'الثاني',className:'4'}));

const SUBJECT_TARGETS=['subject:arabic','subject:quran','subject:islamic','subject:spelling_handwriting'];
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>new Date().toISOString().slice(0,7);
const byId=(id:string|null)=>STUDENTS.find(s=>s.id===id)||null;
const teacherStudentId=()=>location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/)?.[1]||null;
const publicStudentId=()=>new URLSearchParams(location.search).get('studentId');

function announce(message:string,tone:'ok'|'error'|'info'='info'){
 const host=document.querySelector('.teacherStudentAdmin');
 if(!host)return;
 let box=host.querySelector<HTMLElement>('.tsaLiveStatus');
 if(!box){box=document.createElement('div');box.className='tsaLiveStatus';host.prepend(box)}
 box.textContent=message;box.dataset.tone=tone;
}

function installStatusStyle(){
 if(document.getElementById('teacher-live-sync-style'))return;
 const style=document.createElement('style');style.id='teacher-live-sync-style';style.textContent=`
 .tsaLiveStatus{position:sticky;top:6px;z-index:30;margin:8px 12px;padding:10px 12px;border-radius:12px;background:#eef7ff;color:#195b88;border:1px solid #cfe5f5;font-weight:800;font-size:13px;text-align:center;box-shadow:0 3px 12px rgba(31,91,130,.10)}
 .tsaLiveStatus[data-tone="ok"]{background:#edf9f0;color:#247746;border-color:#cfead6}.tsaLiveStatus[data-tone="error"]{background:#fff1f1;color:#a43b3b;border-color:#f0caca}
 .tsaAssessmentSave{width:100%;margin-top:14px;min-height:44px;border:0;border-radius:12px;background:#168fe6;color:white;font-weight:900;font-size:14px}.tsaAssessmentSave:disabled{opacity:.55}
 `;document.head.appendChild(style);
}

function applyStudentIdentityAndStars(){
 if(!location.pathname.startsWith('/student'))return;
 const student=byId(publicStudentId());
 if(!student)return;
 try{
  const old=JSON.parse(localStorage.getItem('studentProfile')||'{}');
  localStorage.setItem('studentProfile',JSON.stringify({...old,...student}));
  localStorage.setItem('studentName',student.name);
  localStorage.setItem('activeStudentId',student.id);
  window.dispatchEvent(new Event('storage'));
 }catch{}
 if(!isFirebaseConfigured())return;
 try{
  const ledger=doc(firebaseDb(),'workspaces',WORKSPACE_ID,'rewardLedgers',`${student.id}_${month()}`);
  onSnapshot(ledger,snap=>{
   const stars=snap.exists()?Math.max(0,Math.min(30,Number(snap.data().stars||0))):0;
   try{
    const old=JSON.parse(localStorage.getItem('studentProfile')||'{}');
    localStorage.setItem('studentProfile',JSON.stringify({...old,...student,currentStars:stars,stars,monthlyStars:stars}));
    localStorage.setItem('studentStars',String(stars));
    window.dispatchEvent(new Event('storage'));
   }catch{}
  });
 }catch{}
}

async function addManualStar(studentId:string){
 if(!isFirebaseConfigured())throw new Error('Firebase غير مهيأ في هذه النسخة');
 const repo=new FirestoreRewardRepository(WORKSPACE_ID);
 const eventId=`manual-star:${studentId}:${Date.now()}`;
 const earned=await repo.applyAssessmentStars(studentId,month(),eventId,1);
 return earned;
}

function selectedAcademic(panel:Element){
 return [...panel.querySelectorAll<HTMLElement>('.tsaSubjectRow')].flatMap((row,index)=>{
  const selected=row.querySelector<HTMLButtonElement>('.tsaChoices button.selected');
  if(!selected)return [];
  const value=selected.dataset.value as Mastery|undefined;
  if(!value)return [];
  return [{targetId:SUBJECT_TARGETS[index]||`subject:${index}`,result:value}];
 });
}

async function saveAssessment(studentId:string,panel:Element){
 if(!isFirebaseConfigured())throw new Error('Firebase غير مهيأ في هذه النسخة');
 const academic=selectedAcademic(panel);
 if(!academic.length)throw new Error('اختر نتيجة لمادة واحدة على الأقل');
 const now=new Date().toISOString();
 const assessment:ComprehensiveAssessment={
  id:`teacher:${studentId}:${Date.now()}`,
  studentId,
  classSessionId:`manual:${today()}`,
  sessionDate:today(),
  enteredAt:now,
  track:'general',
  academic,
  behavior:[]
 };
 const learning=new FirestoreLearningRepository(WORKSPACE_ID);
 const rewards=new FirestoreRewardRepository(WORKSPACE_ID);
 return saveComprehensiveAssessment(assessment,{learning,rewards});
}

async function saveBehavior(studentId:string,code:string,label:string,tone:BehaviorItem['tone']){
 if(!isFirebaseConfigured())throw new Error('Firebase غير مهيأ في هذه النسخة');
 const now=new Date().toISOString();
 const assessment:ComprehensiveAssessment={id:`behavior:${studentId}:${Date.now()}`,studentId,classSessionId:`manual:${today()}`,sessionDate:today(),enteredAt:now,track:'general',academic:[],behavior:[{code,label,tone}]};
 const learning=new FirestoreLearningRepository(WORKSPACE_ID);
 const rewards=new FirestoreRewardRepository(WORKSPACE_ID);
 return saveComprehensiveAssessment(assessment,{learning,rewards});
}

function installTeacherSync(){
 const studentId=teacherStudentId();if(!studentId)return;
 installStatusStyle();
 const attach=()=>{
  const root=document.querySelector('.teacherStudentAdmin');if(!root)return false;
  const assessment=root.querySelector<HTMLElement>('[data-panel="assessment"]');
  if(assessment&&!assessment.querySelector('.tsaAssessmentSave')){
   const save=document.createElement('button');save.type='button';save.className='tsaAssessmentSave';save.textContent='حفظ التقييم وإرساله';assessment.appendChild(save);
   save.addEventListener('click',async()=>{save.disabled=true;announce('جارٍ حفظ التقييم…');try{const result=await saveAssessment(studentId,assessment);announce(`تم حفظ التقييم${result.starsEarned?` وإضافة ${result.starsEarned} نجمة ⭐`:''}`,'ok')}catch(e){announce(e instanceof Error?e.message:'تعذر حفظ التقييم','error')}finally{save.disabled=false}});
  }
  return true;
 };
 if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})}

 document.addEventListener('click',async event=>{
  if(teacherStudentId()!==studentId)return;
  const button=(event.target as Element)?.closest<HTMLButtonElement>('button');if(!button)return;
  const text=(button.textContent||'').trim();
  if(text==='إضافة نجمة'){
   event.preventDefault();button.disabled=true;announce('جارٍ إضافة النجمة…');
   try{const earned=await addManualStar(studentId);announce(earned?`تمت إضافة نجمة ⭐ لهذا الطالب`:'رصيد الطالب وصل للحد الأعلى أو سُجلت مسبقًا','ok')}catch(e){announce(e instanceof Error?e.message:'تعذر إضافة النجمة','error')}finally{button.disabled=false}
  }else if(text==='متميز ⭐'){
   event.preventDefault();button.disabled=true;announce('جارٍ حفظ السلوك المتميز…');
   try{const r=await saveBehavior(studentId,'distinguished','متميز','positive');announce(`تم حفظ السلوك المتميز${r.starsEarned?` وإضافة ${r.starsEarned} نجمة ⭐`:''}`,'ok')}catch(e){announce(e instanceof Error?e.message:'تعذر الحفظ','error')}finally{button.disabled=false}
  }else if(text==='مستمر'){
   event.preventDefault();button.disabled=true;try{await saveBehavior(studentId,'consistent','مستمر','positive');announce('تم حفظ السلوك: مستمر','ok')}catch(e){announce(e instanceof Error?e.message:'تعذر الحفظ','error')}finally{button.disabled=false}
  }else if(text==='يحتاج متابعة'){
   event.preventDefault();button.disabled=true;try{await saveBehavior(studentId,'needs_followup','يحتاج متابعة','needs_attention');announce('تم حفظ: يحتاج متابعة','ok')}catch(e){announce(e instanceof Error?e.message:'تعذر الحفظ','error')}finally{button.disabled=false}
  }else if(text==='إعادة تقييم'){
   event.preventDefault();(root.querySelector<HTMLButtonElement>('.tsaTabs [data-tab="assessment"]'))?.click();announce('اختر التقييم الجديد ثم اضغط حفظ التقييم','info');
  }else if(['إضافة للمتابعة اليومية','خطة علاجية','ملاحظة للطالب','إرسال واجب','إرسال تدريب منزلي','رسالة لولي الأمر','عرض سجل التواصل'].includes(text)){
   event.preventDefault();announce('هذا الإجراء يحتاج شاشة إدخال تفاصيل قبل الحفظ، ولم أربطه بحفظ وهمي.','info');
  }
 },true);
}

applyStudentIdentityAndStars();
installTeacherSync();
