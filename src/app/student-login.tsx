import {advanceBackup} from './backup-progress';
import React from 'react';
import {api,ApiError,asApiError} from './kit';
import './student-login.css';
type Student={id:string;name:string;active?:boolean;lastLoginAt?:number};
const endpoint='/api/student-state?view=student-login';
const digits=(s:string)=>s.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[^0-9]/g,'').slice(0,6);
function loginMessage(error:ApiError){
  if(error.code==='TEACHER_CODE_INVALID'){const left=Number(error.data?.attemptsLeft);return `رمز المعلم غير صحيح.${Number.isFinite(left)?` بقي ${left} من المحاولات قبل الإيقاف المؤقت.`:''}`}
  if(error.code==='TEACHER_LOGIN_LOCKED')return 'محاولات كثيرة غير صحيحة. أُوقف الدخول مؤقتًا؛ حاول بعد 15 دقيقة.';
  if(error.code==='TEACHER_GATE_NOT_CONFIGURED')return 'بوابة المعلم غير مهيأة في هذه البيئة: لم يُضبط رمز المعلم (TEACHER_ACCESS_CODE) في إعدادات الخادم.';
  if(error.code==='TEACHER_CODE_REQUIRED')return 'اكتب رمز المعلم أولًا.';
  if(error.code==='ORIGIN_INVALID')return 'رُفض الطلب لأنه لم يصدر من صفحة الموقع نفسها. افتح الموقع مباشرة ثم حاول.';
  if(error.kind==='offline')return 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول.';
  if(error.kind==='nobackend')return 'هذه النسخة بلا خادم بيانات، فلا يمكن التحقق من الرمز هنا. افتح رابط Staging الكامل.';
  if(error.code==='FIREBASE_ADMIN_NOT_CONFIGURED')return 'قاعدة البيانات غير مهيأة في هذه البيئة، فلا يمكن إتمام الدخول.';
  return `تعذر إتمام الدخول (${error.code}).`;
}
type LoginRole='student'|'teacher';
export function StudentLogin({initialRole='student',onTeacherDone}:{initialRole?:LoginRole;onTeacherDone?:()=>void}={}){
 const [role,setRole]=React.useState<LoginRole>(initialRole);
 const [students,setStudents]=React.useState<Student[]>([]),[id,setId]=React.useState(''),[pin,setPin]=React.useState(''),[code,setCode]=React.useState(''),[busy,setBusy]=React.useState(false),[loading,setLoading]=React.useState(initialRole==='student'),[notice,setNotice]=React.useState('');
 React.useEffect(()=>{
  document.getElementById('site-splash')?.remove();
  if(role!=='student'){setLoading(false);return}
  let active=true;setLoading(true);
  void api<{session:{studentId:string}|null;students:Student[]}>(endpoint).then(r=>{
   if(!active)return;
   if(r.session){location.replace(`/student?studentId=${encodeURIComponent(r.session.studentId)}`);return}
   setStudents(r.students);
  }).catch(()=>{if(active)setNotice('تعذر الاتصال. أعد المحاولة بعد التأكد من الإنترنت.')}).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[role]);
 const choose=(next:LoginRole)=>{if(busy)return;setRole(next);setPin('');setCode('');setNotice('')};
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy||(role==='student'&&(loading||!id||pin.length!==6))||(role==='teacher'&&!code.trim()))return;
  setBusy(true);setNotice('');
  try{
   if(role==='teacher'){
    await api('/api/learning-automation',{method:'POST',body:{action:'login',code}});
    if(onTeacherDone)onTeacherDone();else location.assign('/teacher');
   }else{
    const r=await api<{studentId:string}>(endpoint,{method:'POST',body:{studentId:id,pin}});
    location.assign(`/student?studentId=${encodeURIComponent(r.studentId)}`);
   }
  }catch(error:any){
   const messages:Record<string,string>={STUDENT_LOGIN_LOCKED:'محاولات كثيرة. حاول بعد ١٥ دقيقة.',STUDENT_CODE_INVALID:'الاسم أو الرمز غير صحيح. تحقق من رمزك الخاص.',TEACHER_CODE_INVALID:'كلمة سر المعلم غير صحيحة.',TEACHER_LOGIN_LOCKED:'محاولات كثيرة. حاول بعد ١٥ دقيقة.',TEACHER_GATE_NOT_CONFIGURED:'دخول المعلم غير مهيأ في هذه البيئة.'};
   setNotice(role==='teacher'?loginMessage(asApiError(error)):messages[error?.code]||'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجددًا.');setPin('');setCode('');
  }finally{setBusy(false)}
 };
 return <main className="studentLogin" dir="rtl"><form onSubmit={submit}>
  <header><h1>تعلّمت</h1><p>الثاني الابتدائي / ٤</p></header>
  <section className="studentLoginWelcome"><img src="/pwa/shakabumbo-source-20261022.png" alt="صديقك شكابمبو يحمل الكأس الذهبي" width="1312" height="1199"/><h2>مرحبًا بك في تعلّمت</h2><p>أنا شكابمبو، جاهز نتعلّم معًا؟</p></section>
  <div className="loginRoles" role="group" aria-label="نوع الدخول">
   <button type="button" aria-pressed={role==='student'} disabled={busy} onClick={()=>choose('student')}>دخول الطالب</button>
   <button type="button" aria-pressed={role==='teacher'} disabled={busy} onClick={()=>choose('teacher')}>دخول المعلم</button>
  </div>
  {role==='student'?<>
   <label>اختر اسمك<select value={id} onChange={e=>setId(e.target.value)} required disabled={loading||busy}><option value="">{loading?'جارٍ تحميل الأسماء…':'اختر اسم الطالب'}</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   <label>أدخل رمز الدخول الخاص بك<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={pin} onChange={e=>setPin(digits(e.target.value))} placeholder="الرمز السري — ٦ أرقام" required disabled={busy}/></label>
  </>:<label>كلمة سر المعلم<input type="password" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value)} required disabled={busy}/></label>}
  <button type="submit" disabled={busy||(role==='student'?(loading||!id||pin.length!==6):!code.trim())}>{busy?'جارٍ التحقق…':role==='student'?'دخول إلى صفحتي':'دخول لوحة المعلم'}</button>
  {notice&&<p role="alert">{notice}</p>}<footer>يبقى دخولك محفوظًا على هذا الجهاز</footer>
 </form></main>;
}
export function StudentCodes(){
 const [students,setStudents]=React.useState<Student[]>([]),[backupId,setBackup]=React.useState(''),[backupReady,setBackupReady]=React.useState(false),[issued,setIssued]=React.useState<Record<string,string>>({}),[notice,setNotice]=React.useState(''),[busy,setBusy]=React.useState(false);
 const backupKey=`taallamt:student-backup:${location.origin}`;
 React.useEffect(()=>{try{setBackup(localStorage.getItem(backupKey)||'')}catch{setNotice('تعذر حفظ تقدم النسخ على هذا الجهاز.')}} ,[backupKey]);
 const load=()=>api<{students:Student[]}>(`${endpoint}&loginView=manage`).then(r=>setStudents(r.students));
 React.useEffect(()=>{void load().catch(()=>setNotice('تعذر تحميل حالة الرموز'))},[]);
 const post=(body:Record<string,unknown>)=>api<any>(endpoint,{method:'POST',body});
 const run=async(action:string,id?:string)=>{if(busy)return;if((action==='reset'||action==='revoke')&&!window.confirm('سيُلغى دخول هذا الطالب المحفوظ. تبقى بياناته ورابطه السابق كما هي. متابعة؟'))return;setBusy(true);try{if(action==='backup'){const r=await advanceBackup(post,localStorage,backupKey);setBackup(r.backupId);setBackupReady(r.complete);setNotice(r.complete?`اكتملت النسخة (${r.count} سجلًا). يمكنك إصدار الرموز.`:`حُفظ تقدم النسخة (${r.count} سجلًا). اضغط استكمال لمعالجة الدفعة التالية.`)}else{const r=await post({action:action==='reset'?'issue':action,studentId:id,backupId,reset:action==='reset'});setIssued(x=>{const v={...x};if(r.pin)v[id!]=r.pin;else delete v[id!];return v});setNotice(r.pin?'احفظ الرمز الآن؛ لن يُعرض مجددًا بعد مغادرة الصفحة.':'أُلغي الدخول بالرمز والجلسات المرتبطة به.');await load()}}catch{setNotice('توقف التنفيذ. إذا نفدت الحصة، انتظر زوالها ثم استكمل النسخة نفسها. لم تُعد المحاولة تلقائيًا.')}finally{setBusy(false)}};
 const exportCodes=()=>{const text=['اسم الطالب\tرمز الدخول',...students.filter(s=>issued[s.id]).map(s=>`${s.name}\t${issued[s.id]}`)].join('\n');const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/tab-separated-values;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='student-codes-private.tsv';a.click();URL.revokeObjectURL(url)};
 return <section className="tkBox studentCodes"><h2>رموز دخول الطلاب</h2><p>رمز مستقل من ٦ أرقام. الرموز المخزنة مشفّرة بالتجزئة ولا يمكن استرجاعها؛ يظهر الرمز الجديد مرة واحدة للتسليم.</p><p>رابط الصف الواحد: <a href="/student-login">فتح صفحة دخول الطلاب</a></p><button className="tkAct" disabled={busy||backupReady} onClick={()=>void run('backup')}>{backupReady?'اكتملت النسخة الاحتياطية':backupId?'استكمال النسخة الاحتياطية':'بدء نسخة احتياطية قبل إصدار الرموز'}</button><button className="tkAct" disabled={!Object.keys(issued).length} onClick={exportCodes}>تنزيل رموز التسليم الصادرة الآن — ملف خاص</button>{notice&&<p role="status">{notice}</p>}{students.map(s=><article key={s.id}><strong>{s.name}</strong><p>{s.active?'الدخول بالرمز مفعّل':'لم يُفعّل الرمز'}{s.lastLoginAt?' · سبق له الدخول':''}</p>{issued[s.id]&&<p>رمز التسليم: <b dir="ltr">{issued[s.id]}</b><button onClick={()=>void navigator.clipboard.writeText(issued[s.id])}>نسخ الرمز</button></p>}<button className="tkAct" disabled={busy||!backupReady} onClick={()=>void run(s.active?'reset':'issue',s.id)}>{s.active?'إعادة تعيين الرمز':'إصدار رمز'}</button>{s.active&&<button className="tkAct" disabled={busy||!backupReady} onClick={()=>void run('revoke',s.id)}>إلغاء الدخول بالرمز</button>}</article>)}</section>;
}
