import React from 'react';
import {ShakabumboRig} from './ShakabumboRig';
import {getLessonContext,onLessonContextChange} from './context';
export function ShakabumboCompanion({routeIsQuran}:{routeIsQuran:boolean}){
 const [open,setOpen]=React.useState(false),[draft,setDraft]=React.useState(''),[busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const [turns,setTurns]=React.useState<{role:string;content:string}[]>([]);
 const request=React.useRef<AbortController|null>(null);
 const close=React.useCallback(()=>{request.current?.abort();request.current=null;setOpen(false);setBusy(false);setTurns([]);setDraft('');setError('')},[]);
 React.useEffect(()=>{if(routeIsQuran)close()},[routeIsQuran,close]);
 React.useEffect(()=>onLessonContextChange(()=>close()),[close]);
 React.useEffect(()=>()=>request.current?.abort(),[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();const question=draft.trim(),ctx=getLessonContext();if(!question||busy)return;if(!ctx?.targetId){setError('افتح درسًا من المنصة أولًا.');return}if(routeIsQuran||ctx.subject==='quran')return;
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');setDraft('');const history=turns.slice(-4);setTurns(prev=>[...prev,{role:'user',content:question}]);const timer=setTimeout(()=>controller.abort(),25000);
  try{const q=new URLSearchParams(location.search);const r=await fetch('/api/student-state',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({action:'shakabumbo_reply',studentId:q.get('studentId')||(location.pathname==='/shakabumbo-demo'?'__shakabumbo_demo__':''),invite:q.get('invite')||q.get('inviteToken')||'',demoSession:q.get('demoSession')||'',targetId:ctx.targetId,questionId:ctx.questionId,assessment:ctx.assessment,question,history})});const data=await r.json();if(controller.signal.aborted)return;if(!r.ok||!data.reply)throw new Error();setTurns(prev=>[...prev,{role:'assistant',content:data.reply}].slice(-12))}
  catch{if(request.current===controller)setError(controller.signal.aborted?'تأخر الرد. حاول مرة أخرى.':'تعذر الحصول على الرد. حاول مرة أخرى.')}
  finally{clearTimeout(timer);if(request.current===controller){request.current=null;setBusy(false)}}
 };
 return <section className="shakOneTap shakQuiet" aria-label="مساعدك شكابمبو">
  <div className="shakOneTapLane"><button type="button" className="shakOneTapCharacter" disabled={routeIsQuran} aria-expanded={open} aria-label={open?'إغلاق محادثة شكابمبو':'اكتب لشكابمبو'} onClick={()=>open?close():setOpen(true)}><ShakabumboRig state="LISTENING_QURAN" talking={false}/></button></div>
  <p className="shakTapHint">تحت التطوير — المحادثة كتابية فقط</p>
  {!routeIsQuran&&!open&&<p className="shakTapHint">اضغط على شكابمبو لتكتب سؤالك</p>}
  {open&&!routeIsQuran&&<div className="shakSimpleChat" role="region" aria-label="محادثة شكابمبو الكتابية" dir="rtl">
   <div className="shakChatList" aria-live="polite">{turns.map((t,i)=><p key={i} className={`shakChatBubble ${t.role==='user'?'shakChatBubbleMe':'shakChatBubbleShak'}`}>{t.content}</p>)}</div>
   {busy&&<p role="status">أفكر في سؤالك…</p>}{error&&<p role="alert">{error}</p>}
   <form className="shakChatForm" onSubmit={submit}><label className="shakChatInputLabel">سؤالك<input className="shakChatInput" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={240}/></label><button className="shakChatSend" disabled={busy||!draft.trim()}>إرسال</button></form>
   <button type="button" className="shakChatSend" onClick={close}>إغلاق</button>
  </div>}
 </section>;
}
