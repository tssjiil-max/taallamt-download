// Shared building blocks of the new teacher and student pages: API access with explicit failure kinds,
// hash routing (so the phone back button closes detail pages), icons and the card kit of the reference design.
import React from 'react';
import iconPlan from './assets/icon-plan.webp';
import iconAssessment from './assets/icon-assessment.webp';
import iconHomework from './assets/icon-homework.webp';
import iconStars from './assets/icon-stars.webp';
import subjectArabic from './assets/subject-arabic.webp';
import subjectQuran from './assets/subject-quran.webp';
import subjectIslamic from './assets/subject-islamic.webp';
import subjectSpelling from './assets/subject-spelling.webp';

export type SubjectKey='arabic'|'quran'|'islamic'|'spelling';
export type Result='mastered'|'needs_repeat'|'not_mastered';
export const SUBJECT_ORDER:SubjectKey[]=['arabic','quran','islamic','spelling'];
export const SUBJECT_ICON:Record<SubjectKey,string>={arabic:subjectArabic,quran:subjectQuran,islamic:subjectIslamic,spelling:subjectSpelling};
export const SUBJECT_LABEL:Record<SubjectKey,string>={arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط'};
export const SUBJECT_SHORT:Record<SubjectKey,string>={arabic:'لغتي',quran:'القرآن',islamic:'الدراسات',spelling:'الإملاء والخط'};
export const RESULT_LABEL:Record<Result,string>={mastered:'أتقن',needs_repeat:'يحتاج إعادة',not_mastered:'لم يتقن'};
export const RESULTS:Result[]=['mastered','needs_repeat','not_mastered'];
export const CARD_ICON={plan:iconPlan,assessment:iconAssessment,homework:iconHomework,stars:iconStars};
export const subjectIcon=(key:string)=>SUBJECT_ICON[key as SubjectKey]||subjectArabic;
// Subject icons keep the proportions they have in the reference image (sizes in design units).
// [width, height, drop below the common baseline] — measured from where each icon sits in the reference tiles.
const SUBJECT_ICON_SIZE:Record<SubjectKey,[number,number,number]>={arabic:[21.33,18.91,.7],quran:[17.3,22.13,1.9],islamic:[19.72,22.94,-.1],spelling:[19.72,22.94,3.6]};
export function SubjectImg({subject,scale=1,flat=false}:{subject:string;scale?:number;flat?:boolean}){
  const key=(subject in SUBJECT_ICON_SIZE?subject:'arabic') as SubjectKey,[width,height,drop]=SUBJECT_ICON_SIZE[key];
  return <span className="tkSubjectImg" aria-hidden="true"><img src={SUBJECT_ICON[key]} alt="" style={{width:`calc(var(--u)*${(width*scale).toFixed(2)})`,height:`calc(var(--u)*${(height*scale).toFixed(2)})`,transform:flat?undefined:`translateY(calc(var(--u)*${(drop*scale).toFixed(2)}))`}}/></span>;
}

/* ---------- API ---------- */
export type ApiErrorKind='offline'|'nobackend'|'unauthorized'|'forbidden'|'notfound'|'locked'|'server';
export class ApiError extends Error{
  kind:ApiErrorKind;code:string;status:number;data:any;
  constructor(kind:ApiErrorKind,code:string,status=0,data:any=null){super(code);this.kind=kind;this.code=code;this.status=status;this.data=data}
}
export async function api<T=any>(url:string,options:{method?:'GET'|'POST';body?:unknown}={}):Promise<T>{
  let response:Response;
  try{
    response=await fetch(url,{method:options.method||'GET',cache:'no-store',credentials:'same-origin',headers:options.body===undefined?undefined:{'content-type':'application/json'},body:options.body===undefined?undefined:JSON.stringify(options.body)});
  }catch{throw new ApiError('offline','NETWORK_FAILED')}
  let data:any=null;
  try{data=await response.json()}catch{data=null}
  if(data===null||typeof data!=='object')throw new ApiError(response.status>=500?'server':'nobackend',`HTTP_${response.status}`,response.status);
  if(response.ok&&data.ok!==false)return data as T;
  const code=String(data.error||`HTTP_${response.status}`);
  const kind:ApiErrorKind=response.status===401?'unauthorized':response.status===403?'forbidden':response.status===404?'notfound':response.status===429?'locked':'server';
  throw new ApiError(kind,code,response.status,data);
}
export const asApiError=(error:unknown)=>error instanceof ApiError?error:new ApiError('server',error instanceof Error?error.message:'UNKNOWN');

export type Remote<T>={data:T|null;error:ApiError|null;loading:boolean;reload:(quiet?:boolean)=>Promise<void>;setData:React.Dispatch<React.SetStateAction<T|null>>};
// Loads once, reloads quietly when the page becomes visible again (that is how a change made on the other site shows up).
export function useRemote<T>(key:string|null,loader:()=>Promise<T>):Remote<T>{
  const [data,setData]=React.useState<T|null>(null),[error,setError]=React.useState<ApiError|null>(null),[loading,setLoading]=React.useState(Boolean(key));
  const loaderRef=React.useRef(loader);loaderRef.current=loader;
  const lastRef=React.useRef(0),keyRef=React.useRef(key);keyRef.current=key;
  const reload=React.useCallback(async(quiet=false)=>{
    const current=keyRef.current;if(!current)return;
    if(!quiet){setLoading(true)}
    try{const value=await loaderRef.current();if(keyRef.current!==current)return;lastRef.current=Date.now();setData(value);setError(null)}
    catch(caught){if(keyRef.current!==current)return;if(!quiet)setError(asApiError(caught))}
    finally{if(keyRef.current===current&&!quiet)setLoading(false)}
  },[]);
  React.useEffect(()=>{setData(null);setError(null);if(key){void reload()}else setLoading(false)},[key,reload]);
  React.useEffect(()=>{
    const onVisible=()=>{if(document.visibilityState==='visible'&&keyRef.current&&Date.now()-lastRef.current>15000)void reload(true)};
    document.addEventListener('visibilitychange',onVisible);window.addEventListener('focus',onVisible);
    return ()=>{document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('focus',onVisible)};
  },[reload]);
  return {data,error,loading,reload,setData};
}

/* ---------- routing by hash ---------- */
const readHash=()=>decodeURIComponent(location.hash.replace(/^#\/?/,''));
let internalSteps=0;
export function useHashRoute():[string,(route:string)=>void,()=>void]{
  const [route,setRoute]=React.useState(readHash);
  React.useEffect(()=>{const onChange=()=>{setRoute(readHash());window.scrollTo(0,0)};window.addEventListener('hashchange',onChange);return ()=>window.removeEventListener('hashchange',onChange)},[]);
  const go=React.useCallback((next:string)=>{if(next===readHash())return;internalSteps+=1;location.hash=next?`#${next}`:''},[]);
  const back=React.useCallback(()=>{if(internalSteps>0){internalSteps-=1;history.back()}else{history.replaceState(null,'',location.pathname+location.search);setRoute('');window.scrollTo(0,0)}},[]);
  return [route,go,back];
}

/* ---------- formatting ---------- */
const DATE_LOCALE='ar-SA-u-ca-gregory-nu-latn';
export function formatDay(date:string,withWeekday=true){
  if(!/^\d{4}-\d{2}-\d{2}/.test(date))return '';
  try{return new Intl.DateTimeFormat(DATE_LOCALE,{timeZone:'UTC',...(withWeekday?{weekday:'long'}:{}),day:'numeric',month:'long'}).format(new Date(`${date.slice(0,10)}T00:00:00Z`))}catch{return date}
}
export function formatStamp(iso:string){
  if(!iso)return '';const value=new Date(iso);if(Number.isNaN(value.getTime()))return '';
  try{return new Intl.DateTimeFormat(DATE_LOCALE,{timeZone:'Asia/Riyadh',weekday:'long',day:'numeric',month:'long',hour:'numeric',minute:'2-digit'}).format(value)}catch{return iso}
}
export function greeting(){
  let hour=new Date().getHours();
  try{hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',hour:'numeric',hourCycle:'h23'}).format(new Date()))}catch{/* device clock */}
  return hour<12?'صباح الخير':'مساء الخير';
}
export function countLabel(count:number,one:string,two:string,few:string,many:string){
  if(count===1)return one;if(count===2)return two;if(count>=3&&count<=10)return `${count} ${few}`;return `${count} ${many}`;
}
export const studentsLabel=(count:number)=>count===1?'طالب واحد':count===2?'طالبان':count>=3&&count<=10?`${count} طلاب`:`${count} طالبًا`;
export const newRequestId=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;

/* ---------- icons ---------- */
type SvgProps={className?:string};
const stroke={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
export const IconUserFilled=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="7.6" r="4.4" fill="currentColor"/><path d="M3.6 21.2c0-4.6 3.6-7.4 8.4-7.4s8.4 2.8 8.4 7.4c0 .5-.4.8-.9.8H4.5c-.5 0-.9-.3-.9-.8Z" fill="currentColor"/></svg>;
export const IconChevron=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
export const IconCheck=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
export const IconStar=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="m12 2.8 2.75 5.6 6.18.9-4.47 4.35 1.06 6.15L12 16.9l-5.52 2.9 1.06-6.15L3.07 9.3l6.18-.9z" fill="currentColor"/></svg>;
export const NavHome=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12.9 2.9a1.4 1.4 0 0 0-1.8 0L3.2 9.8c-.4.4-.7.9-.7 1.5v8.2c0 1.1.9 2 2 2h4.2c.5 0 .9-.4.9-.9v-4.3c0-.8.7-1.5 1.5-1.5h1.8c.8 0 1.5.7 1.5 1.5v4.3c0 .5.4.9.9.9h4.2c1.1 0 2-.9 2-2v-8.2c0-.6-.3-1.1-.7-1.5Z" fill="currentColor"/></svg>;
export const NavHomeLine=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M3.4 10.6 12 3.4l8.6 7.2v8.6c0 .9-.7 1.6-1.6 1.6h-3.9v-5.4c0-.8-.6-1.4-1.4-1.4h-3.4c-.8 0-1.4.6-1.4 1.4v5.4H5c-.9 0-1.6-.7-1.6-1.6Z" {...stroke}/></svg>;
export const NavBook=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 6.5C10.2 5 7.6 4.4 4.7 4.6 4.1 4.6 3.7 5.1 3.7 5.6V17.1C3.7 17.7 4.2 18.1 4.8 18.1 7.6 17.9 10.1 18.5 12 19.8 13.9 18.5 16.4 17.9 19.2 18.1 19.8 18.1 20.3 17.7 20.3 17.1V5.6C20.3 5.1 19.9 4.6 19.3 4.6 16.4 4.4 13.8 5 12 6.5ZM12 6.5V19.8" {...stroke}/></svg>;
export const NavStar=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 3.3 14.6 8.6 20.5 9.5 16.2 13.6 17.2 19.4 12 16.7 6.8 19.4 7.8 13.6 3.5 9.5 9.4 8.6Z" {...stroke}/></svg>;
export const NavUser=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="8" r="4.1" {...stroke}/><path d="M4.3 20.7C4.8 16.7 7.7 14.4 12 14.4S19.2 16.7 19.7 20.7Z" {...stroke}/></svg>;
export const NavPeople=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="9" cy="8.2" r="3.4" {...stroke}/><path d="M2.8 20C3.2 16.3 5.6 14.2 9 14.2S14.8 16.3 15.2 20Z" {...stroke}/><path d="M15.6 5.2A3.2 3.2 0 0 1 15.6 11.4M17.6 14.6C19.7 15.2 20.9 17 21.2 20" {...stroke}/></svg>;
export const NavMore=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="5.5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18.5" cy="12" r="1.7" fill="currentColor"/></svg>;

/* ---------- reference card kit ---------- */
export function Screen({children,nav}:{children:React.ReactNode;nav?:React.ReactNode}){
  return <div className="tk" dir="rtl" lang="ar"><main className="tkScreen">{children}</main>{nav}</div>;
}
export function Header({title,subtitle,hero,heroClass='',heroAlt='',onAvatar,avatarLabel}:{title:string;subtitle:string;hero?:string;heroClass?:string;heroAlt?:string;onAvatar?:()=>void;avatarLabel:string}){
  return <header className="tkHeader">
    <button className="tkAvatar" type="button" onClick={onAvatar} aria-label={avatarLabel}><IconUserFilled/></button>
    <div className="tkHello"><h1>{title}</h1><p>{subtitle}</p></div>
    {hero&&<img className={`tkHero ${heroClass}`} src={hero} alt={heroAlt} aria-hidden={heroAlt?undefined:true}/>}
  </header>;
}
export type CardTone='plan'|'assessment'|'homework'|'stars';
export function Card({tone,title,subtitle,small,onOpen,children}:{tone:CardTone;title:string;subtitle:string;small?:string;onOpen:()=>void;children:React.ReactNode}){
  return <section className={`tkCard ${tone}`} aria-label={title}>
    <button className="tkCardHead" type="button" onClick={onOpen} aria-label={`${title}: عرض التفاصيل`}>
      <img className="tkCardIcon" src={CARD_ICON[tone]} alt="" aria-hidden="true"/>
      <b className="tkCardTitle">{title}</b><span className="tkCardSub">{subtitle}</span>{small&&<span className="tkCardSmall">{small}</span>}
      <span className="tkChevron" aria-hidden="true"><IconChevron/></span>
    </button>
    {children}
  </section>;
}
export const Cta=({onClick,label='عرض التفاصيل'}:{onClick:()=>void;label?:string})=><button className="tkCta" type="button" onClick={onClick}>{label}</button>;
export function Pill({status,label}:{status:Result|null;label?:string}){
  return <span className={`tkPill ${status||'pending'}`}>{label||(status?RESULT_LABEL[status]:'لم يُقيّم بعد')}</span>;
}
export function Check({on,busy=false}:{on:boolean;busy?:boolean}){return <span className={`tkCheck ${on?'on':''} ${busy?'busy':''}`} aria-hidden="true"><IconCheck/></span>}

export type NavItem={key:string;label:string;icon:React.ReactNode;activeIcon?:React.ReactNode;onClick?:()=>void;href?:string};
export function BottomNav({items,active,label}:{items:NavItem[];active:string;label:string}){
  return <nav className="tkNav" aria-label={label}>{items.map(item=>item.href
    ?<a key={item.key} href={item.href}>{item.icon}<span>{item.label}</span></a>
    :<button key={item.key} type="button" className={active===item.key?'on':''} aria-current={active===item.key?'page':undefined} onClick={item.onClick}>{active===item.key&&item.activeIcon?item.activeIcon:item.icon}<span>{item.label}</span></button>)}</nav>;
}

export function PageHead({title,subtitle,icon,onBack}:{title:string;subtitle?:string;icon?:string;onBack:()=>void}){
  return <header className="tkPageHead"><button className="tkBack" type="button" onClick={onBack} aria-label="رجوع"><IconChevron/></button><div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{icon&&<img src={icon} alt="" aria-hidden="true"/>}</header>;
}
export function Fact({label,children}:{label:string;children:React.ReactNode}){return <div className="tkFact"><dt>{label}</dt><dd>{children}</dd></div>}

/* ---------- loading / empty / failure states (never mixed up) ---------- */
const STATIC_HOST=/githack|githubusercontent|github\.io/.test(location.hostname);
export function failureText(error:ApiError,role:'teacher'|'student'):{title:string;text:string;retry:boolean}{
  if(error.kind==='offline')return {title:'تعذر الاتصال',text:'لم نصل إلى الخادم. تحقق من الإنترنت ثم أعد المحاولة. لم تُحذف أي بيانات.',retry:true};
  if(error.kind==='nobackend')return {title:'لا يوجد خادم لهذه النسخة',text:STATIC_HOST?'هذه نسخة عرض ثابتة للتصميم فقط، بلا خادم بيانات. افتح رابط Staging الكامل لتجربة البيانات الحقيقية.':'هذه النسخة لا يتصل بها خادم البيانات، لذلك لا تظهر الخطة والواجبات والتقييم هنا.',retry:true};
  if(error.kind==='unauthorized'||error.kind==='forbidden')return role==='student'
    ?{title:'لا توجد صلاحية',text:error.code==='STUDENT_ACCESS_DENIED'?'هذا الرابط لا يخص هذا الطالب. استخدم رابط الطالب الذي أرسله المعلم.':'تُفتح صفحة الطالب من الرابط الخاص الذي يرسله المعلم لولي الأمر.',retry:false}
    :{title:'انتهت جلسة المعلم',text:'سجّل الدخول برمز المعلم للمتابعة.',retry:false};
  if(error.kind==='notfound')return {title:'غير موجود',text:error.code==='STUDENT_NOT_FOUND'?'هذا الطالب غير موجود في قائمة الصف.':'العنصر المطلوب غير موجود.',retry:false};
  if(error.code==='FIREBASE_ADMIN_NOT_CONFIGURED')return {title:'قاعدة البيانات غير مهيأة',text:'لم تُضبط مفاتيح قاعدة البيانات في هذه البيئة، لذلك لا يمكن قراءة البيانات.',retry:true};
  if(error.code==='PRODUCTION_WRITE_BLOCKED')return {title:'الكتابة موقوفة',text:'هذه البيئة لا تسمح بالحفظ.',retry:false};
  return {title:'حدث خطأ في الخادم',text:`تعذر إتمام الطلب (${error.code}). أعد المحاولة بعد قليل.`,retry:true};
}
export function Failure({error,role,onRetry,children}:{error:ApiError;role:'teacher'|'student';onRetry?:()=>void;children?:React.ReactNode}){
  const info=failureText(error,role);
  return <div className="tkState warn" role="alert"><b>{info.title}</b><p>{info.text}</p>{info.retry&&onRetry&&<button className="tkBtn" type="button" onClick={onRetry}>إعادة المحاولة</button>}{children}</div>;
}
export function CardsSkeleton(){
  return <div className="tkCards" aria-busy="true" aria-label="جارٍ التحميل">{[118,126,113.5,101.4].map(height=><div key={height} className="tkSkeleton" style={{height:`calc(var(--u)*${height})`}}/>)}</div>;
}
export const Loading=({text='جارٍ التحميل…'}:{text?:string})=><div className="tkEmpty" aria-busy="true">{text}</div>;
export const Empty=({children}:{children:React.ReactNode})=><div className="tkEmpty">{children}</div>;

export function useToast():[React.ReactNode,(text:string,bad?:boolean)=>void]{
  const [toast,setToast]=React.useState<{text:string;bad:boolean;id:number}|null>(null);
  React.useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),toast.bad?4200:2400);return ()=>clearTimeout(timer)},[toast]);
  const show=React.useCallback((text:string,bad=false)=>setToast({text,bad,id:Date.now()}),[]);
  return [toast?<div className={`tkToast ${toast.bad?'bad':''}`} role="status" key={toast.id}>{toast.text}</div>:null,show];
}

/* ---------- weekly plan details (the same block on both sites) ---------- */
export type PlanItem={subjectKey:SubjectKey;label:string;short:string;unit:string;lesson:string;skill:string;holiday:boolean;page:number|null;exercise:string;days:{weekday:number;day:string;text:string}[];note:string;edited:boolean;summary:string;published:boolean};
export type Plan={week:number;weekKey:string;termWeeks:number;range:{start:string;end:string};holiday:boolean;published:boolean;publishedAt:string;items:PlanItem[];gaps:{subjectKey:string;message:string}[];fromDistribution?:boolean};
export function PlanSubject({item,action}:{item:PlanItem;action?:React.ReactNode}){
  const quran=item.subjectKey==='quran';
  return <section className="tkBox blue">
    <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>{item.label}</b>{item.unit&&!item.holiday&&<small>{quran?`سورة ${item.unit}`:`الوحدة: ${item.unit}`}</small>}</div>{action}</div>
    {item.holiday?<Empty>إجازة — لا يوجد درس جديد هذا الأسبوع.</Empty>:<dl className="tkFacts">
      {item.lesson&&<Fact label={quran?'المطلوب حفظه':'الدرس'}>{item.lesson}</Fact>}
      {item.page&&<Fact label="الصفحة"><span className="num">{item.page}</span>{item.exercise?` — ${item.exercise}`:''}</Fact>}
      {item.skill&&<Fact label="المهارة">{item.skill}</Fact>}
    </dl>}
    {!item.holiday&&item.days.length>0&&<div className="tkDays">{item.days.map(day=><span key={day.weekday}><b>{day.day}</b>{day.text?`: ${day.text}`:''}</span>)}</div>}
    {item.note&&<p className="tkNoteLine">ملاحظة المعلم: {item.note}</p>}
  </section>;
}
export function planStamp(plan:Plan){
  if(plan.fromDistribution||!plan.published)return 'من توزيع المنهج المعتمد';
  const stamp=formatStamp(plan.publishedAt);
  return stamp?`نُشرت تلقائيًا: ${stamp}`:'نُشرت تلقائيًا';
}
export const weekTitle=(plan:{week:number;range:{start:string;end:string}})=>`الأسبوع ${plan.week} · ${formatDay(plan.range.start,false)} – ${formatDay(plan.range.end,false)}`;
