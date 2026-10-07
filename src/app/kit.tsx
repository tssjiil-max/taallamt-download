// Shared building blocks of the new teacher and student pages: API access with explicit failure kinds,
// hash routing (so the phone back button closes detail pages), icons and the card kit of the reference design.
import React from 'react';
import iconPlan from './assets/icon-plan.webp';
import iconAssessment from './assets/icon-assessment.webp';
import iconHomework from './assets/icon-homework.webp';
// Original Shakabumbo artwork supplied by the school (design/shakabumbo/originals), outer black background removed.
import shakArabic from './assets/shak-arabic.webp';
import shakQuran from './assets/shak-quran.webp';
import shakIslamic from './assets/shak-islamic.webp';
import shakSpelling from './assets/shak-spelling.webp';
import shakStar from './assets/shak-star.webp';
import shakLogo from './assets/shak-logo.webp';
import shakSourati from './assets/shak-sourati.webp';
import shakTrophy from './assets/shak-trophy.webp';
import shakStanding from './assets/shak-standing.webp';

export type SubjectKey='arabic'|'quran'|'islamic'|'spelling';
export type Result='mastered'|'needs_repeat'|'not_mastered';
export const SUBJECT_ORDER:SubjectKey[]=['arabic','quran','islamic','spelling'];
export const SUBJECT_ICON:Record<SubjectKey,string>={arabic:shakArabic,quran:shakQuran,islamic:shakIslamic,spelling:shakSpelling};
export const SUBJECT_LABEL:Record<SubjectKey,string>={arabic:'لغتي',quran:'القرآن الكريم',islamic:'الدراسات الإسلامية',spelling:'الإملاء والخط'};
export const SUBJECT_SHORT:Record<SubjectKey,string>={arabic:'لغتي',quran:'القرآن',islamic:'الدراسات',spelling:'الإملاء والخط'};
export const RESULT_LABEL:Record<Result,string>={mastered:'أتقن',needs_repeat:'يحتاج إعادة',not_mastered:'لم يتقن'};
export const RESULTS:Result[]=['mastered','needs_repeat','not_mastered'];
// Section icons: the stars section uses the original «نجم اليوم» artwork. No Shakabumbo originals were supplied for
// the plan, assessment and homework sections, so those keep the icons of the approved reference design.
export const CARD_ICON={plan:iconPlan,assessment:iconAssessment,homework:iconHomework,stars:shakStar};
export const SHAK={logo:shakLogo,sourati:shakSourati,trophy:shakTrophy,standing:shakStanding,star:shakStar};
export const subjectIcon=(key:string)=>SUBJECT_ICON[key as SubjectKey]||shakArabic;
// The four subject pictures are trimmed to the artwork, so one box gives them the same visual size.
export function SubjectImg({subject,size=50}:{subject:string;size?:number}){
  const key=(subject in SUBJECT_ICON?subject:'arabic') as SubjectKey;
  return <span className="tkSubjectImg" aria-hidden="true" style={{width:`calc(var(--u)*${(size*.82).toFixed(2)})`,height:`calc(var(--u)*${size})`}}><img src={SUBJECT_ICON[key]} alt=""/></span>;
}

/* ---------- API ---------- */
export type ApiErrorKind='offline'|'nobackend'|'unauthorized'|'forbidden'|'notfound'|'locked'|'server';
export class ApiError extends Error{
  kind:ApiErrorKind;code:string;status:number;data:any;
  constructor(kind:ApiErrorKind,code:string,status=0,data:any=null){super(code);this.kind=kind;this.code=code;this.status=status;this.data=data}
}
export async function api<T=any>(url:string,options:{method?:'GET'|'POST';body?:unknown;signal?:AbortSignal}={}):Promise<T>{
  let response:Response;
  try{
    response=await fetch(url,{method:options.method||'GET',cache:'no-store',credentials:'same-origin',signal:options.signal,headers:options.body===undefined?undefined:{'content-type':'application/json'},body:options.body===undefined?undefined:JSON.stringify(options.body)});
  }catch(caught){if(options.signal?.aborted)throw new ApiError('offline','REQUEST_STOPPED');void caught;throw new ApiError('offline','NETWORK_FAILED')}
  let data:any=null;
  try{data=await response.json()}catch{data=null}
  if(data===null||typeof data!=='object')throw new ApiError(response.status>=500?'server':'nobackend',`HTTP_${response.status}`,response.status);
  if(response.ok&&data.ok!==false)return data as T;
  const code=String(data.error||`HTTP_${response.status}`);
  const kind:ApiErrorKind=response.status===401?'unauthorized':response.status===403?'forbidden':response.status===404?'notfound':response.status===429?'locked':'server';
  throw new ApiError(kind,code,response.status,data);
}
export const asApiError=(error:unknown)=>error instanceof ApiError?error:new ApiError('server',error instanceof Error?error.message:'UNKNOWN');

export type Remote<T>={data:T|null;error:ApiError|null;loading:boolean;reload:(quiet?:boolean)=>Promise<void>;refreshIfOlder:(ms:number)=>void;setData:React.Dispatch<React.SetStateAction<T|null>>};
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
  const refreshIfOlder=React.useCallback((ms:number)=>{if(keyRef.current&&lastRef.current&&Date.now()-lastRef.current>ms)void reload(true)},[reload]);
  return {data,error,loading,reload,refreshIfOlder,setData};
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
// Hijri (Umm al-Qura) and Gregorian dates and the clock, always in Saudi time, whatever the device is set to.
function dateText(calendar:string,date:Date){
  const parts=new Intl.DateTimeFormat(`ar-SA-u-ca-${calendar}-nu-latn`,{timeZone:'Asia/Riyadh',day:'numeric',month:'long',year:'numeric'}).formatToParts(date);
  const part=(type:string)=>parts.find(item=>item.type===type)?.value||'';
  return `${part('day')} ${part('month')} ${part('year')}`;
}
export function hijriDate(date=new Date()){try{return `${dateText('islamic-umalqura',date)} هـ`}catch{return ''}}
export function gregorianDate(date=new Date()){try{return `${dateText('gregory',date)} م`}catch{return ''}}
// A school date (YYYY-MM-DD) in both calendars. The weekly plan always shows the two together.
type Calendar='islamic-umalqura'|'gregory';
function isoParts(calendar:Calendar,iso:string){
  const parts=new Intl.DateTimeFormat(`ar-SA-u-ca-${calendar}-nu-latn`,{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date(`${iso.slice(0,10)}T00:00:00Z`));
  const part=(type:string)=>parts.find(item=>item.type===type)?.value||'';
  return {day:part('day'),month:part('month'),year:part('year')};
}
const ERA:Record<Calendar,string>={'islamic-umalqura':'هـ',gregory:'م'};
export function rangeText(calendar:Calendar,start:string,end:string){
  try{
    const a=isoParts(calendar,start),b=isoParts(calendar,end),era=ERA[calendar];
    if(a.month===b.month&&a.year===b.year)return `${a.day} إلى ${b.day} ${a.month} ${a.year} ${era}`;
    if(a.year===b.year)return `${a.day} ${a.month} إلى ${b.day} ${b.month} ${a.year} ${era}`;
    return `${a.day} ${a.month} ${a.year} إلى ${b.day} ${b.month} ${b.year} ${era}`;
  }catch{return ''}
}
export const hijriRange=(range:{start:string;end:string})=>rangeText('islamic-umalqura',range.start,range.end);
export const gregorianRange=(range:{start:string;end:string})=>rangeText('gregory',range.start,range.end);
export function dayInBoth(iso:string){
  try{const h=isoParts('islamic-umalqura',iso),g=isoParts('gregory',iso);return {hijri:`${h.day} ${h.month} ${h.year} هـ`,gregorian:`${g.day} ${g.month} ${g.year} م`,hijriShort:`${h.day} ${h.month}`,gregorianShort:`${g.day} ${g.month}`}}
  catch{return {hijri:'',gregorian:iso,hijriShort:'',gregorianShort:iso}}
}
export const addDays=(iso:string,days:number)=>new Date(Date.parse(`${iso.slice(0,10)}T00:00:00Z`)+days*86400000).toISOString().slice(0,10);
export function riyadhClock(date=new Date()){try{return new Intl.DateTimeFormat('ar-SA-u-nu-latn',{timeZone:'Asia/Riyadh',hour:'numeric',minute:'2-digit',hour12:true}).format(date)}catch{return ''}}
// Re-renders once a minute so the date strip changes by itself at midnight.
export function useNow(intervalMs=60000){
  const [now,setNow]=React.useState(()=>new Date());
  React.useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),intervalMs);return ()=>clearInterval(timer)},[intervalMs]);
  return now;
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
export const IconCalendar=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="3" {...stroke}/><path d="M8 3v4M16 3v4M3.5 10h17" {...stroke}/></svg>;
export const IconSprout=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 21v-9M12 13c-5 0-7-3-7-7 4 0 7 2 7 7ZM12 11c0-5 3-7 7-7 0 4-2 7-7 7Z" {...stroke}/></svg>;
export const IconMessage=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><rect x="3" y="5" width="18" height="14" rx="3" {...stroke}/><path d="m4.5 7.5 7.5 5.5 7.5-5.5" {...stroke}/></svg>;
export const IconAlert=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9.5" fill="currentColor" opacity=".16"/><path d="M12 7v6.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/><circle cx="12" cy="16.8" r="1.3" fill="currentColor"/></svg>;
export const IconBookLogo=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 6.500C10.2 5 7.6 4.4 4.7 4.6 4.1 4.6 3.7 5.1 3.7 5.600V17.100C3.7 17.7 4.2 18.1 4.8 18.1 7.6 17.9 10.1 18.5 12 19.8 13.9 18.5 16.4 17.9 19.2 18.1 19.8 18.1 20.3 17.7 20.3 17.100V5.600C20.3 5.1 19.9 4.6 19.3 4.6 16.4 4.4 13.8 5 12 6.500ZM12 6.500V19.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
export const IconGear=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="12" r="3.1" {...stroke}/><path d="M19.2 13.3a7.4 7.4 0 0 0 0-2.6l1.9-1.5-1.9-3.3-2.3.9a7.3 7.3 0 0 0-2.2-1.300L14.3 3h-4.600l-.4 2.500a7.3 7.3 0 0 0-2.2 1.300l-2.3-.9-1.9 3.3 1.9 1.500a7.4 7.4 0 0 0 0 2.600l-1.9 1.5 1.9 3.3 2.3-.900c.7.6 1.4 1 2.2 1.300l.4 2.500h4.600l.4-2.500c.8-.3 1.5-.7 2.2-1.300l2.3.9 1.9-3.300Z" {...stroke}/></svg>;
export const IconHeart=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 20.500s-7.5-4.4-7.5-10.300A4.2 4.2 0 0 1 12 7.600a4.2 4.2 0 0 1 7.5 2.600c0 5.9-7.5 10.3-7.5 10.300Z" fill="currentColor"/></svg>;
export const IconTarget=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><circle cx="12" cy="12" r="8.5" {...stroke}/><circle cx="12" cy="12" r="4.3" {...stroke}/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>;
export const IconTrophy=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M8 4h8v5.500c0 3-1.8 5-4 5s-4-2-4-5ZM8 6H4.500v1.500c0 2.5 1.5 3.8 3.5 4M16 6h3.500v1.500c0 2.5-1.5 3.8-3.5 4M12 14.500V18M8.5 20.500h7" {...stroke}/></svg>;
export const IconSpark=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M12 2.500c.9 5 2.5 6.6 7.5 7.5-5 .9-6.6 2.5-7.5 7.5-.9-5-2.5-6.6-7.5-7.5 5-.9 6.6-2.5 7.5-7.500Z" fill="currentColor"/></svg>;
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
export function Card({tone,title,subtitle,small,dates,onOpen,children}:{tone:CardTone;title:string;subtitle:string;small?:string;dates?:string[];onOpen:()=>void;children:React.ReactNode}){
  return <section className={`tkCard ${tone}`} aria-label={title}>
    <button className="tkCardHead" type="button" onClick={onOpen} aria-label={`${title}: عرض التفاصيل`}>
      <img className="tkCardIcon" src={CARD_ICON[tone]} alt="" aria-hidden="true"/>
      <b className="tkCardTitle">{title}</b><span className="tkCardSub">{subtitle}</span>{dates&&dates.length>0&&<span className="tkCardDates">{dates.map(text=><span key={text} dir="rtl">{text}</span>)}</span>}{small&&<span className="tkCardSmall">{small}</span>}
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
  return <nav className={`tkNav ${items.length===5?'five':''}`} aria-label={label}>{items.map(item=>item.href
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
const SCHOOL_DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
// The week in both calendars: the two ranges, then every school day with its Hijri and Gregorian date.
export function PlanDates({plan,compact=false}:{plan:{week:number;range:{start:string;end:string}};compact?:boolean}){
  return <section className="tkDates" aria-label={`تاريخ الأسبوع ${plan.week} بالهجري والميلادي`}>
    <div className="tkDatesHead"><b>الأسبوع {plan.week}</b>
      <span><IconCalendar/><span dir="rtl">{hijriRange(plan.range)}</span></span>
      <span><IconCalendar/><span dir="rtl">{gregorianRange(plan.range)}</span></span></div>
    {!compact&&<table className="tkDatesTable"><thead><tr><th scope="col">اليوم</th><th scope="col">هجري</th><th scope="col">ميلادي</th></tr></thead>
      <tbody>{SCHOOL_DAYS.map((label,index)=>{const day=dayInBoth(addDays(plan.range.start,index));return <tr key={label}><th scope="row">{label}</th><td>{day.hijri}</td><td>{day.gregorian}</td></tr>})}</tbody></table>}
  </section>;
}
export function PlanSubject({item,action,start}:{item:PlanItem;action?:React.ReactNode;start?:string}){
  const quran=item.subjectKey==='quran';
  return <section className="tkBox blue">
    <div className="tkBoxHead"><img src={subjectIcon(item.subjectKey)} alt="" aria-hidden="true"/><div><b>{item.label}</b>{item.unit&&!item.holiday&&<small>{quran?`سورة ${item.unit}`:`الوحدة: ${item.unit}`}</small>}</div>{action}</div>
    {item.holiday?<Empty>إجازة — لا يوجد درس جديد هذا الأسبوع.</Empty>:<dl className="tkFacts">
      {item.lesson&&<Fact label={quran?'المطلوب حفظه':'الدرس'}>{item.lesson}</Fact>}
      {item.page&&<Fact label="الصفحة"><span className="num">{item.page}</span>{item.exercise?` — ${item.exercise}`:''}</Fact>}
      {item.skill&&<Fact label="المهارة">{item.skill}</Fact>}
    </dl>}
    {!item.holiday&&item.days.length>0&&<div className="tkDays">{item.days.map(day=>{const both=start?dayInBoth(addDays(start,day.weekday)):null;return <span key={day.weekday}><b>{day.day}</b>{both&&<i>{both.hijriShort} · {both.gregorianShort}</i>}{day.text?`: ${day.text}`:''}</span>})}</div>}
    {item.note&&<p className="tkNoteLine">ملاحظة المعلم: {item.note}</p>}
  </section>;
}
export function planStamp(plan:Plan){
  if(plan.fromDistribution||!plan.published)return 'من توزيع المنهج المعتمد';
  const stamp=formatStamp(plan.publishedAt);
  return stamp?`نُشرت تلقائيًا: ${stamp}`:'نُشرت تلقائيًا';
}
export const weekTitle=(plan:{week:number;range:{start:string;end:string}})=>`الأسبوع ${plan.week} · ${hijriRange(plan.range)} · ${gregorianRange(plan.range)}`;
// One line for the plan card on the home pages: the week in both calendars.
export const weekDatesLine=(plan:{range:{start:string;end:string}})=>`${hijriRange(plan.range)} · ${gregorianRange(plan.range)}`;

/* ---------- conversation (the same block for the guardian and for the teacher) ---------- */
export type ChatMessage={id:string;from:'guardian'|'teacher';mine:boolean;text:string;createdAt:string;readAt:string;unread:boolean};
type Draft={clientId:string;text:string;state:'sending'|'failed';reason:string};
export function chatFailure(error:ApiError){
  if(error.kind==='offline')return 'تعذر الاتصال بالخادم';
  if(error.code==='MESSAGE_TOO_LONG')return 'الرسالة أطول من الحد المسموح';
  if(error.code==='MESSAGE_LIMIT_REACHED')return 'بلغت حد الرسائل اليومي';
  if(error.code==='GUARDIAN_LINK_REQUIRED')return 'الإرسال يحتاج رابط ولي الأمر';
  if(error.kind==='unauthorized'||error.kind==='forbidden')return 'لا توجد صلاحية للإرسال';
  return `تعذر الإرسال (${error.code})`;
}
// `send` resolves only after the server stored the message. A failed message stays in the list with «إعادة المحاولة»,
// and the retry reuses the same id, so the server never stores it twice.
export function Chat({messages,canSend,blockedNote,otherLabel,send,maxLength=1000}:{messages:ChatMessage[];canSend:boolean;blockedNote?:string;otherLabel:string;send:(text:string,clientId:string)=>Promise<void>;maxLength?:number}){
  const [text,setText]=React.useState(''),[drafts,setDrafts]=React.useState<Draft[]>([]);
  const end=React.useRef<HTMLDivElement>(null);
  const waiting=drafts.filter(draft=>!messages.some(message=>message.id.endsWith(`_${draft.clientId}`)));
  const sending=waiting.some(draft=>draft.state==='sending');
  React.useEffect(()=>{end.current?.scrollIntoView({block:'end'})},[messages.length,waiting.length]);
  const deliver=async(draft:Draft)=>{
    setDrafts(list=>list.map(item=>item.clientId===draft.clientId?{...item,state:'sending',reason:''}:item));
    try{await send(draft.text,draft.clientId);setDrafts(list=>list.filter(item=>item.clientId!==draft.clientId))}
    catch(caught){const reason=chatFailure(asApiError(caught));setDrafts(list=>list.map(item=>item.clientId===draft.clientId?{...item,state:'failed',reason}:item))}
  };
  const submit=(event?:React.FormEvent)=>{
    event?.preventDefault();const value=text.trim();if(!value||sending||!canSend)return;
    const draft:Draft={clientId:newRequestId(),text:value,state:'sending',reason:''};
    setText('');setDrafts(list=>[...list,draft]);void deliver(draft);
  };
  return <>
    <div className="tkChat" role="log" aria-label="سجل المحادثة">
      {!messages.length&&!waiting.length&&<Empty>لا توجد رسائل بعد. اكتب رسالتك في الأسفل.</Empty>}
      {messages.map(message=><div key={message.id} className={`tkBubble ${message.mine?'mine':''}`}>
        <small>{message.mine?'أنت':otherLabel}</small><p>{message.text}</p>
        <span>{formatStamp(message.createdAt)}{message.mine?(message.readAt?' · قُرئت ✓✓':' · أُرسلت ✓'):''}</span></div>)}
      {waiting.map(draft=><div key={draft.clientId} className={`tkBubble mine ${draft.state==='failed'?'failed':''}`}>
        <small>أنت</small><p>{draft.text}</p>
        {draft.state==='sending'?<span>جارٍ الإرسال…</span>:<><span role="alert">لم تُرسل — {draft.reason}</span>
          <div className="tkActions"><button className="tkMini on" type="button" onClick={()=>void deliver(draft)}>إعادة المحاولة</button><button className="tkMini" type="button" onClick={()=>setDrafts(list=>list.filter(item=>item.clientId!==draft.clientId))}>حذف</button></div></>}
      </div>)}
      <div ref={end}/>
    </div>
    {canSend?<form className="tkComposer" onSubmit={submit}>
      <textarea value={text} maxLength={maxLength} rows={1} onChange={event=>setText(event.target.value)} placeholder="اكتب رسالتك…" aria-label="نص الرسالة"/>
      <button className="tkBtn" type="submit" disabled={!text.trim()||sending}>{sending?'جارٍ الإرسال…':'إرسال'}</button>
    </form>:<div className="tkAlert info">{blockedNote||'الإرسال غير متاح في هذه الصفحة.'}</div>}
    {canSend&&text.length>maxLength*.8&&<p className="tkCount"><span className="num">{text.length}/{maxLength}</span></p>}
  </>;
}
// Reloads a remote value on a timer while its page is open (new messages appear without leaving the page).
export function usePolling(reload:(quiet?:boolean)=>Promise<void>,ms:number){
  React.useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')void reload(true)},ms);return ()=>clearInterval(timer)},[reload,ms]);
}
export const fileSize=(bytes:number)=>bytes>=1048576?`${(bytes/1048576).toFixed(1)} م.ب`:`${Math.max(1,Math.round(bytes/1024))} ك.ب`;
export const IconFolder=(p:SvgProps)=><svg viewBox="0 0 24 24" aria-hidden="true" {...p}><path d="M3.5 7.5c0-1.1.9-2 2-2h4l2 2.2h7c1.1 0 2 .9 2 2v7.8c0 1.1-.9 2-2 2h-13c-1.1 0-2-.9-2-2Z" {...stroke}/></svg>;
