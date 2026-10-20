export type VoicePhase='idle'|'requesting-permission'|'generating-audio'|'listening'|'thinking'|'speaking'|'muted'|'error';
export interface RecognitionLike{
 lang:string;interimResults:boolean;maxAlternatives:number;continuous:boolean;
 onstart:(()=>void)|null;onend:(()=>void)|null;
 onresult:((event:{resultIndex?:number;results:ArrayLike<ArrayLike<{transcript:string}>&{isFinal?:boolean}>})=>void)|null;
 onerror:((event:{error:string})=>void)|null;
 start():void;abort():void;
}
export interface VoiceDependencies{
 recognition:()=>RecognitionLike|null;
 speak:(text:string,handlers:{onStart:()=>void;onEnd:()=>void;onError:(code?:string)=>void})=>boolean;
 cancelSpeech:()=>void;
 reply:(text:string)=>string|Promise<string>;
 update:(phase:VoicePhase,message?:string)=>void;
 schedule?:(callback:()=>void)=>ReturnType<typeof setTimeout>;
}
let owner:VoiceSession|null=null;
export function stopActiveVoiceSession(){owner?.stop()}
// One active recognizer or utterance at a time. Generation tokens reject late callbacks
// after close, mute, navigation, lesson changes, or Quran playback.
export class VoiceSession{
 private bargeIn=false;private spokenText='';private watchingInterruption=false;
 private active=false;private generation=0;private recognition:RecognitionLike|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;private silence=0;
 constructor(private d:VoiceDependencies){}
 private clear(){this.watchingInterruption=false;if(this.timer!==null){clearTimeout(this.timer);this.timer=null}const r=this.recognition;this.recognition=null;if(r){r.onstart=r.onresult=r.onend=r.onerror=null;try{r.abort()}catch{}}}
 stop(phase:VoicePhase='idle'){const mayCancelSpeech=owner===this||owner===null;if(owner===this)owner=null;this.active=false;this.playing=false;this.generation++;this.clear();if(mayCancelSpeech)this.d.cancelSpeech();this.d.update(phase)}
 start(greeting?:string){stopActiveVoiceSession();this.stop();owner=this;this.active=true;this.silence=0;if(greeting)this.say(greeting,true);else this.listen()}
 // Experimental recognition during playback is opt-in: headphones reduce acoustic echo.
 setBargeIn(enabled:boolean){this.bargeIn=enabled;if(!enabled&&this.watchingInterruption){this.clear();if(this.active&&!this.playing)this.listen()}else if(enabled&&this.playing&&this.active&&!this.recognition)this.watchInterruption(this.spokenText,this.generation)}
 private playing=false;
 interrupt(){if(owner!==this)return;this.generation++;this.playing=false;this.clear();this.d.cancelSpeech();this.d.update('idle');this.active=true;this.listen()}
 private watchInterruption(spoken:string,initialToken:number,attempt=0){
  let token=initialToken;
  if(!this.active||!this.bargeIn||token!==this.generation||attempt>=3||this.recognition)return;
  if(this.timer!==null){clearTimeout(this.timer);this.timer=null}
  const r=this.d.recognition();if(!r)return;this.recognition=r;this.watchingInterruption=true;
  r.lang='ar-SA';r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
  const normalized=(s:string)=>s.normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآ]/g,'ا').replace(/[^ء-ي0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const sourceText=normalized(spoken),source=new Set(sourceText.split(' '));let denied=false,interrupted=false,pending='';
  r.onstart=()=>{if(token===this.generation&&this.active)this.d.update('speaking','المقاطعة التجريبية مفعّلة؛ استخدم سماعة لتقليل التقاط صوتي.')};
  r.onresult=e=>{
   if(token!==this.generation||!this.active||!this.bargeIn)return;
   const result=e.results[e.resultIndex??Math.max(0,e.results.length-1)],text=result?.[0]?.transcript?.trim()||'',clean=normalized(text),tokens=clean.split(' ').filter(Boolean);
   if(!tokens.length)return;
   if(!interrupted){
    const overlap=tokens.filter(w=>source.has(w)).length/tokens.length;
    const question=/^(لماذا|كيف|هل|ما |متى|اين|وين|اشرح|توقف|لحظه|لا )/.test(clean);
    if(sourceText.includes(clean)||(!question&&overlap>=0.8))return;
    if(result.isFinal===false&&tokens.length<2&&!/^(توقف|لحظه|اسكت)$/.test(clean))return;
    interrupted=true;token=++this.generation;this.playing=false;this.d.cancelSpeech();
    this.d.update('listening','أسمعك؛ أكمل سؤالك.');
    this.timer=setTimeout(()=>{if(this.active&&token===this.generation)this.fail('تأخر اكتمال السؤال. اضغط استئناف وحاول مرة أخرى.')},12000);
   }
   pending=text;
   if(result.isFinal!==false)this.answer(text,true);
  };
  r.onerror=e=>{denied=e.error!=='no-speech';if(token!==this.generation||!this.active)return;if(denied&&interrupted)this.fail('تعذر استقبال المقاطعة. اضغط استئناف وحاول مرة أخرى.');else if(denied)this.d.update('speaking','تعذرت المقاطعة الصوتية في هذا الجهاز؛ استخدم زر «قاطعني وتكلم».')};
  r.onend=()=>{if(token!==this.generation||!this.active)return;this.clear();if(interrupted&&!denied&&pending)this.answer(pending,true);else if(!denied&&this.playing)this.later(()=>this.watchInterruption(spoken,token,attempt+1))};
  try{r.start()}catch{this.clear();this.d.update('speaking','المقاطعة الصوتية غير متاحة الآن؛ استخدم زر «قاطعني وتكلم».')}
 }
 private fail(message:string){this.stop();this.d.update('error',message)}
 private later(callback:()=>void){const token=this.generation;this.timer=(this.d.schedule||((fn)=>setTimeout(fn,500)))(()=>{this.timer=null;if(this.active&&token===this.generation)callback()})}
 private listen(){
  if(!this.active)return;this.clear();const r=this.d.recognition();
  if(!r){this.fail('الميكروفون الصوتي غير مدعوم في هذا المتصفح. يمكنك استخدام الكتابة.');return}
  const token=this.generation;this.recognition=r;let result=false,failed=false;
  r.lang='ar-SA';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
  r.onstart=()=>{if(this.active&&token===this.generation){if(this.timer!==null){clearTimeout(this.timer);this.timer=null}this.d.update('listening')}};
  r.onresult=event=>{if(!this.active||token!==this.generation||result)return;const text=event.results[0]?.[0]?.transcript?.trim();if(text){result=true;this.silence=0;this.answer(text)}};
  r.onerror=event=>{if(!this.active||token!==this.generation)return;failed=true;
   if(event.error==='no-speech'){this.clear();if(++this.silence<3)this.later(()=>this.listen());else this.fail('لم أسمع سؤالًا. اضغط استئناف عندما تكون جاهزًا.');return}
   const messages:Record<string,string>={'not-allowed':'لم يُسمح باستخدام الميكروفون. يمكنك الكتابة أو السماح له من إعدادات المتصفح.','service-not-allowed':'خدمة التعرف على الكلام غير متاحة هنا.','audio-capture':'لم نجد ميكروفونًا متاحًا.','network':'تعذر الاتصال بخدمة الكلام في المتصفح. تحقق من الإنترنت ثم استأنف.','language-not-supported':'التعرف على العربية غير متاح في هذا الجهاز.'};
   this.fail(messages[event.error]||'توقفت خدمة الكلام. يمكنك استئنافها أو استخدام الكتابة.');
  };
  r.onend=()=>{if(!this.active||token!==this.generation||result||failed)return;this.clear();if(++this.silence<3)this.later(()=>this.listen());else this.fail('توقف الاستماع. اضغط استئناف عندما تكون جاهزًا.')};
  try{this.d.update('requesting-permission');this.timer=setTimeout(()=>{if(this.active&&token===this.generation)this.fail('تأخر تشغيل الميكروفون. تحقق من الإذن ثم استأنف.')},12000);r.start()}catch{this.fail('تعذر بدء الميكروفون. اضغط استئناف أو استخدم الكتابة.')}
 }
 answer(text:string,voiceLoop=this.active){
  if(owner!==this){stopActiveVoiceSession();owner=this}
  this.generation++;this.clear();this.d.cancelSpeech();this.d.update('thinking');
  const token=this.generation;
  try{const reply=this.d.reply(text);if(typeof reply==='string')this.say(reply,voiceLoop);else reply.then(value=>{if(token===this.generation)this.say(value,voiceLoop)}).catch(()=>{if(token===this.generation)this.fail('تعذر الاتصال بالمساعد. حاول مرة أخرى بعد قليل.')})}catch{this.fail('تعذر الاتصال بالمساعد. حاول مرة أخرى بعد قليل.')}
 }
 private say(text:string,voiceLoop:boolean){
  this.generation++;this.clear();this.d.cancelSpeech();this.active=voiceLoop;
  const token=this.generation;let settled=false;this.d.update('generating-audio');
  const success=this.d.speak(text,{onStart:()=>{if(token===this.generation){this.playing=true;this.spokenText=text;this.d.update('speaking');if(this.bargeIn&&this.active)this.watchInterruption(text,token)}},onEnd:()=>{if(token!==this.generation||settled)return;settled=true;this.playing=false;this.clear();if(this.active)this.later(()=>this.listen());else this.d.update('idle')},onError:(code)=>{if(token===this.generation&&!settled){settled=true;const messages:Record<string,string>={model_terms_required:'خدمة الصوت تنتظر تفعيل النموذج من حساب المعلم.',GROQ_NOT_CONFIGURED:'خدمة الصوت غير مهيأة في نسخة العرض.',TIMEOUT:'تأخر تجهيز الصوت. حاول مرة أخرى.',AUDIO_BLOCKED:'سمح المتصفح بتشغيل الصفحة لكنه منع الصوت. اضغط استئناف.',rate_limit_exceeded:'وصلت خدمة الصوت إلى حد الاستخدام المجاني. حاول لاحقًا.'};this.fail(messages[code||'']||'تعذر تشغيل الصوت. اضغط على صورتي لإغلاق المحادثة ثم حاول مرة أخرى.')}}});
  if(!success&&token===this.generation)this.fail('تعذر تجهيز الصوت. يمكنك استخدام الكتابة من الخيارات.');
 }
}
