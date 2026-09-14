type Tone='ok'|'error'|'info';
type AcademicResult='mastered'|'needs_practice';
type StudentState={
 ok:boolean;
 student:{id:string;number:number;name:string;fullName:string;grade:string;className:string};
 stars:number;
 assessments:Array<{id:string;enteredAt?:string;academic?:Array<{targetId:string;result:AcademicResult}>;behavior?:Array<{code:string;label:string;tone:string}>}>;
 remediation:Array<Record<string,unknown>>;
 homework:Array<{id:string;title:string;instructions?:string;subject?:string;kind?:string;assignedAt?:string}>;
 communications:Array<{id:string;reason?:string;reasonCode?:string;summary:string;createdAt?:string}>;
};

const STUDENTS=[
 'أحمد بسام صالح الأحمد','أسامه سلطان بن بخت الصاعدي','أمير نايف عبدالله الحجلي','أنس احمد عبدالله الجهني','أوس نايف بن حمد الشريف','أويس عادل فيصل المالكي','تميم ماجد جابر الحجلي','ثامر عبدالله رجاء العوفي','راكان حاتم مهل الجهني','ريان محمود - باري','سلطان فهد زعل الجهني','شامخ بدر لافي الجهني','عادل غالب عبدالله العنزي','عبدالجليل سالم محمود عبدالجليل','عبدالرحمن نواف هندي الحازمي','عمر حميد بن سليم العروي','فيصل محمد عويض المطيري','قصي عبدالله ظاهر الحجلي','كنان محمد عبدالعزيز اليوسفي','محمد سماح سعد البوق','محمد صالح حمد عواد','موسى رياض صالح الأحمد','نايف احمد صويدر الجهني','نواف مطلق صالح العمري','وائل محمد حسين روزي','وسام سلطان عبيد السناني','يمان احمد بن عايد الجهني','يوسف فلاح خلف الحربي','يوسف محمد لافي الجهني'
].map((name,index)=>({id:`s2-4-${String(index+1).padStart(2,'0')}`,number:index+1,name,grade:'الثاني',className:'4'}));
const TARGETS=['subject:arabic','subject:quran','subject:islamic','subject:spelling_handwriting'];
const TARGET_TITLES:Record<string,string>={'subject:arabic':'لغتي','subject:quran':'القرآن الكريم','subject:islamic':'الدراسات الإسلامية','subject:spelling_handwriting':'الإملاء والخط'};
const teacherStudentId=()=>location.pathname.match(/^\/teacher\/student\/(s2-4-\d{2})\/?$/)?.[1]||null;
const publicStudentId=()=>new URLSearchParams(location.search).get('studentId');
const byNumber=(n:number)=>STUDENTS[n-1]||null;

function readableError(error:unknown){
 const raw=error instanceof Error?error.message:String(error);
 const map:Record<string,string>={STUDENT_NOT_FOUND:'الطالب غير موجود',ASSESSMENT_EMPTY:'اختر نتيجة لمادة واحدة على الأقل',TEXT_REQUIRED:'اكتب التفاصيل أولًا',TITLE_REQUIRED:'اكتب عنوان الواجب أو التدريب',PRODUCTION_WRITE_BLOCKED:'الحفظ متاح في Staging فقط',FIREBASE_ADMIN_NOT_CONFIGURED:'ربط Firebase غير متاح'};
 return map[raw]||raw||'تعذر تنفيذ العملية';
}

async function apiGet(studentId:string):Promise<StudentState>{
 const r=await fetch(`/api/student-state?studentId=${encodeURIComponent(studentId)}`,{cache:'no-store'});
 const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||`HTTP_${r.status}`);return data;
}
async function apiPost(studentId:string,payload:Record<string,unknown>){
 const r=await fetch('/api/student-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId,...payload})});
 const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||`HTTP_${r.status}`);return data;
}

function installStyles(){
 if(document.getElementById('taallamt-live-sync-style'))return;
 const style=document.createElement('style');style.id='taallamt-live-sync-style';style.textContent=`
 .tsaLiveStatus{position:sticky;top:6px;z-index:30;margin:8px 12px;padding:10px 12px;border-radius:12px;background:#eef7ff;color:#195b88;border:1px solid #cfe5f5;font-weight:800;font-size:13px;text-align:center;box-shadow:0 3px 12px rgba(31,91,130,.10)}
 .tsaLiveStatus[data-tone="ok"]{background:#edf9f0;color:#247746;border-color:#cfead6}.tsaLiveStatus[data-tone="error"]{background:#fff1f1;color:#a43b3b;border-color:#f0caca}
 .tsaAssessmentSave{width:100%;margin-top:14px;min-height:44px;border:0;border-radius:12px;background:#168fe6;color:white;font-weight:900;font-size:14px}.tsaAssessmentSave:disabled{opacity:.55}
 .tsaStarBalance{margin:0 0 12px;padding:9px 12px;border-radius:11px;background:#fff8e8;color:#8b6512;font-weight:800;text-align:center}
 .studentTeacherUpdates{margin:14px 14px 0;padding:13px 14px;border-radius:18px;background:#fff;border:1px solid #e4eef5;box-shadow:0 4px 14px rgba(55,104,135,.08);color:#28516f}.studentTeacherUpdates h3{margin:0 0 8px;font-size:15px;color:#1475bd}.studentTeacherUpdates article{padding:7px 0;border-top:1px solid #eef3f6}.studentTeacherUpdates article:first-of-type{border-top:0}.studentTeacherUpdates b{font-size:11px}.studentTeacherUpdates p{margin:2px 0 0;font-size:11px;line-height:1.5}
 .taallamtToast{position:fixed;z-index:9999;left:50%;bottom:84px;transform:translateX(-50%);max-width:86vw;padding:11px 16px;border-radius:14px;background:#173f70;color:#fff;font-weight:800;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.2);text-align:center}.taallamtToast[data-tone="error"]{background:#9d3535}.taallamtToast[data-tone="ok"]{background:#257a4c}
 .taallamtModal{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.38);display:grid;place-items:center;padding:18px}.taallamtModal>section{width:min(390px,94vw);max-height:72vh;overflow:auto;background:#fff;border-radius:18px;padding:16px;color:#244c75;box-shadow:0 12px 38px rgba(0,0,0,.22)}.taallamtModal h3{margin:0 0 10px;color:#0b62bc}.taallamtModal article{padding:9px 0;border-top:1px solid #e7eef4}.taallamtModal button{width:100%;height:42px;margin-top:12px;border:0;border-radius:11px;background:#168fe6;color:#fff;font-weight:800}
 .checkItem[data-done="true"]{opacity:.62}.checkItem[data-done="true"] .checkBox::after{content:'✓';font-weight:900}
 `;document.head.appendChild(style);
}

function toast(message:string,tone:Tone='info'){
 let box=document.querySelector<HTMLElement>('.taallamtToast');if(!box){box=document.createElement('div');box.className='taallamtToast';document.body.appendChild(box)}
 box.textContent=message;box.dataset.tone=tone;window.setTimeout(()=>{if(box?.isConnected)box.remove()},2600);
}
function announce(message:string,tone:Tone='info'){
 const host=document.querySelector('.teacherStudentAdmin');if(!host){toast(message,tone);return}
 let box=host.querySelector<HTMLElement>('.tsaLiveStatus');if(!box){box=document.createElement('div');box.className='tsaLiveStatus';host.prepend(box)}
 box.textContent=message;box.dataset.tone=tone;
}
function modal(title:string,rows:string[]){
 document.querySelector('.taallamtModal')?.remove();const wrap=document.createElement('div');wrap.className='taallamtModal';
 const section=document.createElement('section'),h=document.createElement('h3');h.textContent=title;section.appendChild(h);
 if(!rows.length){const p=document.createElement('p');p.textContent='لا توجد بيانات مسجلة حتى الآن.';section.appendChild(p)}else rows.forEach(text=>{const a=document.createElement('article');a.textContent=text;section.appendChild(a)});
 const close=document.createElement('button');close.type='button';close.textContent='إغلاق';close.addEventListener('click',()=>wrap.remove());section.appendChild(close);wrap.appendChild(section);wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap);
}

function saveIdentity(state:StudentState){
 try{
  const old=JSON.parse(localStorage.getItem('studentProfile')||'{}');
  const profile={...old,...state.student,currentStars:state.stars,stars:state.stars,monthlyStars:state.stars};
  localStorage.setItem('studentProfile',JSON.stringify(profile));localStorage.setItem('studentName',state.student.name);localStorage.setItem('activeStudentId',state.student.id);localStorage.setItem('studentStars',String(state.stars));window.dispatchEvent(new Event('storage'));
 }catch{}
}
function latestAcademic(state:StudentState){
 const result=new Map<string,AcademicResult>();
 for(const assessment of state.assessments){for(const item of assessment.academic||[]){if(!result.has(item.targetId))result.set(item.targetId,item.result)}}return result;
}
function renderSubjectProgress(state:StudentState){
 const latest=latestAcademic(state);
 for(const [targetId,result] of latest){const title=TARGET_TITLES[targetId];if(!title)continue;const card=[...document.querySelectorAll<HTMLElement>('.student .studentSubject')].find(c=>c.dataset.subjectName===title||(c.textContent||'').includes(title));if(!card)continue;const bar=card.querySelector<HTMLElement>('.subjectBar i');if(bar)bar.style.width=result==='mastered'?'100%':'55%';card.dataset.liveResult=result;card.setAttribute('aria-label',`${title}: ${result==='mastered'?'أتقن':'يحتاج تدريب'}`)}
}
function renderServerTasks(state:StudentState){
 const panels=[...document.querySelectorAll<HTMLElement>('.student .dayPanel')];const tasks=panels.find(p=>(p.querySelector('h3')?.textContent||'').includes('مهامي اليوم'));if(!tasks)return;
 tasks.querySelectorAll('.serverTask').forEach(n=>n.remove());
 state.homework.slice(0,4).reverse().forEach(item=>{const button=document.createElement('button');button.type='button';button.className='taskItem serverTask';const circle=document.createElement('span');circle.className='taskCircle';const text=document.createElement('div');text.className='taskText';const b=document.createElement('b');b.textContent=item.title;const s=document.createElement('span');s.textContent=item.kind==='training'?'تدريب منزلي من المعلم':'واجب من المعلم';text.append(b,s);button.append(circle,text);button.addEventListener('click',()=>button.classList.toggle('done'));tasks.insertBefore(button,tasks.children[1]||null)});
}
function renderTeacherUpdates(state:StudentState){
 const student=document.querySelector('.student');const rewards=student?.querySelector('.rewards');if(!student||!rewards)return;
 let box=student.querySelector<HTMLElement>('.studentTeacherUpdates');if(!state.communications.length){box?.remove();return}if(!box){box=document.createElement('section');box.className='studentTeacherUpdates';rewards.parentElement?.insertBefore(box,rewards)}box.replaceChildren();const h=document.createElement('h3');h.textContent='تحديثات المعلم';box.appendChild(h);
 state.communications.slice(0,3).forEach(item=>{const a=document.createElement('article'),b=document.createElement('b'),p=document.createElement('p');b.textContent=item.reason||'تحديث';p.textContent=item.summary;a.append(b,p);box?.appendChild(a)});
}
function applyStudentState(state:StudentState){saveIdentity(state);requestAnimationFrame(()=>{renderSubjectProgress(state);renderServerTasks(state);renderTeacherUpdates(state)});window.setTimeout(()=>{renderSubjectProgress(state);renderServerTasks(state);renderTeacherUpdates(state)},250)}

function installStudentLive(){
 if(!location.pathname.startsWith('/student'))return;const studentId=publicStudentId();if(!studentId)return;
 let busy=false;const refresh=async()=>{if(busy||document.hidden)return;busy=true;try{applyStudentState(await apiGet(studentId))}catch(e){console.error('student live',e)}finally{busy=false}};
 refresh();window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});window.setInterval(refresh,10000);
}

function selectedAcademic(panel:Element){
 return [...panel.querySelectorAll<HTMLElement>('.tsaSubjectRow')].flatMap((row,index)=>{const selected=row.querySelector<HTMLButtonElement>('.tsaChoices button.selected');const value=selected?.dataset.value as AcademicResult|undefined;return value?[{targetId:TARGETS[index]||`subject:${index}`,result:value}]:[]});
}
async function withButton(button:HTMLButtonElement,job:()=>Promise<void>){if(button.disabled)return;button.disabled=true;try{await job()}finally{button.disabled=false}}
async function refreshTeacherStudent(studentId:string){
 try{const state=await apiGet(studentId);const behavior=document.querySelector<HTMLElement>('.teacherStudentAdmin [data-panel="behavior"]');if(behavior){let balance=behavior.querySelector<HTMLElement>('.tsaStarBalance');if(!balance){balance=document.createElement('div');balance.className='tsaStarBalance';behavior.insertBefore(balance,behavior.children[1]||null)}balance.textContent=`رصيد النجوم: ${state.stars} / 30 ⭐`};return state}catch(e){announce(readableError(e),'error');return null}
}
function activateRequestedTab(){
 const raw=new URLSearchParams(location.search).get('tab');const tab=raw==='communication'?'homework':raw; if(!tab)return;const btn=document.querySelector<HTMLButtonElement>(`.teacherStudentAdmin .tsaTabs [data-tab="${tab}"]`);btn?.click();
}
function installTeacherStudentActions(){
 const studentId=teacherStudentId();if(!studentId)return;
 const attach=()=>{const root=document.querySelector<HTMLElement>('.teacherStudentAdmin');if(!root)return false;const assessment=root.querySelector<HTMLElement>('[data-panel="assessment"]');if(assessment&&!assessment.querySelector('.tsaAssessmentSave')){const save=document.createElement('button');save.type='button';save.className='tsaAssessmentSave';save.textContent='حفظ التقييم وإرساله';assessment.appendChild(save);save.addEventListener('click',()=>withButton(save,async()=>{const academic=selectedAcademic(assessment);if(!academic.length){announce('اختر نتيجة لمادة واحدة على الأقل','error');return}announce('جارٍ حفظ التقييم…');try{await apiPost(studentId,{action:'assessment',academic});announce('تم حفظ التقييم وإرساله لصفحة الطالب ✓','ok')}catch(e){announce(readableError(e),'error')}}))}refreshTeacherStudent(studentId);window.setTimeout(activateRequestedTab,0);return true};
 if(!attach()){const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(document.getElementById('root')||document.body,{childList:true,subtree:true})}
 document.addEventListener('click',event=>{
  if(teacherStudentId()!==studentId)return;const button=(event.target as Element)?.closest<HTMLButtonElement>('button');if(!button||button.classList.contains('tsaAssessmentSave')||button.closest('.tsaTabs'))return;const text=(button.textContent||'').trim();
  const stop=()=>{event.preventDefault();event.stopPropagation()};
  if(text==='إضافة نجمة'){stop();void withButton(button,async()=>{announce('جارٍ إضافة النجمة…');try{const data=await apiPost(studentId,{action:'star'});announce(`تمت إضافة النجمة ⭐ الرصيد الآن ${data.state.stars}/30`,'ok');await refreshTeacherStudent(studentId)}catch(e){announce(readableError(e),'error')}});return}
  const behaviorMap:Record<string,string>={'متميز ⭐':'distinguished','مستمر':'consistent','يحتاج متابعة':'needs_followup'};
  if(behaviorMap[text]){stop();void withButton(button,async()=>{try{await apiPost(studentId,{action:'behavior',code:behaviorMap[text]});announce(`تم حفظ السلوك: ${text.replace(' ⭐','')} ✓`,'ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='إعادة تقييم'){stop();document.querySelector<HTMLButtonElement>('.teacherStudentAdmin .tsaTabs [data-tab="assessment"]')?.click();announce('اختر التقييم الجديد ثم اضغط «حفظ التقييم وإرساله»');return}
  if(text==='إضافة للمتابعة اليومية'){stop();const summary=window.prompt('اكتب ملاحظة المتابعة اليومية:','');if(!summary)return;void withButton(button,async()=>{try{await apiPost(studentId,{action:'followup',summary});announce('تمت إضافة المتابعة وإرسالها ✓','ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='خطة علاجية'){stop();const summary=window.prompt('اكتب تفاصيل الخطة العلاجية أو التدريب المطلوب:','');if(!summary)return;void withButton(button,async()=>{try{await apiPost(studentId,{action:'remediation',summary});announce('تم حفظ الخطة العلاجية وإظهارها في متابعة الطالب ✓','ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='ملاحظة للطالب'){stop();const summary=window.prompt('اكتب الملاحظة التي ستظهر في صفحة الطالب/ولي الأمر:','');if(!summary)return;void withButton(button,async()=>{try{await apiPost(studentId,{action:'student_note',summary});announce('تم إرسال الملاحظة ✓','ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='إرسال واجب'||text==='إرسال تدريب منزلي'){stop();const title=window.prompt(text==='إرسال واجب'?'عنوان الواجب:':'عنوان التدريب المنزلي:','');if(!title)return;const instructions=window.prompt('التعليمات (اختياري):','')||'';void withButton(button,async()=>{try{await apiPost(studentId,{action:text==='إرسال واجب'?'homework':'training',title,instructions});announce(`${text==='إرسال واجب'?'تم إرسال الواجب':'تم إرسال التدريب المنزلي'} ✓`,'ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='رسالة لولي الأمر'){stop();const summary=window.prompt('اكتب رسالة ولي الأمر:','');if(!summary)return;void withButton(button,async()=>{try{await apiPost(studentId,{action:'guardian_message',summary});announce('تم حفظ الرسالة وإظهارها في صفحة ولي الأمر ✓','ok')}catch(e){announce(readableError(e),'error')}});return}
  if(text==='عرض سجل التواصل'){stop();void withButton(button,async()=>{try{const state=await apiGet(studentId);modal('سجل التواصل',state.communications.map(x=>`${x.reason||'تواصل'} — ${x.summary}`))}catch(e){announce(readableError(e),'error')}});return}
 },true);
}

function installRosterRouting(){
 if(location.pathname!=='/teacher/students')return;
 document.addEventListener('click',event=>{const row=(event.target as Element)?.closest<HTMLElement>('.teacherStudentRow');if(!row)return;const n=Number(row.querySelector('.teacherStudentNumber')?.textContent||0),student=byNumber(n);if(!student)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const mode=new URLSearchParams(location.search).get('mode');const tab=mode==='communication'?'homework':mode==='followup'?'followup':mode==='assessment'?'assessment':'';location.href=`/teacher/student/${student.id}${tab?`?tab=${tab}`:''}`},true);
}

function installTeacherDashboardActions(){
 if(location.pathname!=='/teacher')return;
 document.addEventListener('click',event=>{const button=(event.target as Element)?.closest<HTMLButtonElement>('button');if(!button)return;const text=(button.textContent||'').trim();const quick=button.closest('.tQuick');const nav=button.closest('.teacherNav');const panel=button.closest('.panel');
  if(text.includes('ابدأ الحصة')){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const active=button.dataset.started==='true';button.dataset.started=active?'false':'true';button.textContent=active?'ابدأ الحصة':'الحصة جارية ✓';toast(active?'تم إنهاء وضع الحصة':'تم بدء الحصة','ok');return}
  if(quick){const title=(button.querySelector('b')?.textContent||'').trim();if(title==='الطلاب')return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(title==='المناهج'){const target=[...document.querySelectorAll<HTMLElement>('.panel')].find(p=>(p.querySelector('h3')?.textContent||'').includes('تقدم المنهج'));target?.scrollIntoView({behavior:'smooth'});toast('تم فتح تقدم المنهج');}else if(title==='التقييم الشامل')location.href='/teacher/students?mode=assessment';else if(title==='التواصل')location.href='/teacher/students?mode=communication';return}
  if(panel&&text==='عرض الكل'){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const title=panel.querySelector('h3')?.textContent||'';if(title.includes('متابعة اليوم'))location.href='/teacher/students?mode=followup';else if(title.includes('تقدم المنهج'))toast('تقدم المواد الأربع ظاهر بالكامل');else if(title.includes('مهامي اليوم'))toast('هذه مهام اليوم الحالية');else if(title.includes('الإعلانات'))toast('هذه إعلانات اليوم الحالية');return}
  if(button.classList.contains('checkItem')){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();const done=button.dataset.done==='true';button.dataset.done=done?'false':'true';button.setAttribute('aria-pressed',String(!done));toast(done?'أعيدت المهمة للقائمة':'تم إنجاز المهمة ✓',done?'info':'ok');return}
  if(nav){const title=(button.querySelector('b')?.textContent||'').trim();if(title==='الرئيسية'||title==='الطلاب')return;if(title==='شكابمبو'||title==='المزيد'){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();toast(title==='شكابمبو'?'شكابمبو جاهز لدعم الحصة 🤖':'المزيد: استخدم أقسام المعلم الحالية لإدارة الفصل');return}}
 },true);
}

installStyles();
installStudentLive();
installRosterRouting();
installTeacherStudentActions();
installTeacherDashboardActions();
