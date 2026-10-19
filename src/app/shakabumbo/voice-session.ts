export type VoicePhase='idle'|'listening'|'thinking'|'speaking'|'muted'|'error';
export interface RecognitionLike{
 lang:string;interimResults:boolean;maxAlternatives:number;continuous:boolean;
 onstart:(()=>void)|null;onend:(()=>void)|null;
 onresult:((event:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void)|null;
 onerror:((event:{error:string})=>void)|null;
 start():void;abort():void;
}
export interface VoiceDependencies{
 recognition:()=>RecognitionLike|null;
 speak:(text:string,handlers:{onStart:()=>void;onEnd:()=>void;onError:()=>void})=>boolean;
 cancelSpeech:()=>void;
 reply:(text:string)=>string;
 update:(phase:VoicePhase,message?:string)=>void;
 schedule?:(callback:()=>void)=>ReturnType<typeof setTimeout>;
}
// One active recognizer or utterance at a time. Generation tokens reject late callbacks
// after close, mute, navigation, lesson changes, or Quran playback.
export class VoiceSession{
 private active=false;private generation=0;private recognition:RecognitionLike|null=null;
 private timer:ReturnType<typeof setTimeout>|null=null;private silence=0;
 constructor(private d:VoiceDependencies){}
 private clear(){if(this.timer!==null){clearTimeout(this.timer);this.timer=null}const r=this.recognition;this.recognition=null;if(r){r.onstart=r.onresult=r.onend=r.onerror=null;try{r.abort()}catch{}}}
 stop(phase:VoicePhase='idle'){this.active=false;this.generation++;this.clear();this.d.cancelSpeech();this.d.update(phase)}
 start(greeting?:string){this.stop();this.active=true;this.silence=0;if(greeting)this.say(greeting,true);else this.listen()}
 private fail(message:string){this.stop();this.d.update('error',message)}
 private later(callback:()=>void){const token=this.generation;this.timer=(this.d.schedule||((fn)=>setTimeout(fn,500)))(()=>{this.timer=null;if(this.active&&token===this.generation)callback()})}
 private listen(){
  if(!this.active)return;this.clear();const r=this.d.recognition();
  if(!r){this.fail('الميكروفون الصوتي غير مدعوم في هذا المتصفح. يمكنك استخدام الكتابة.');return}
  const token=this.generation;this.recognition=r;let result=false,failed=false;
  r.lang='ar-SA';r.continuous=false;r.interimResults=false;r.maxAlternatives=1;
  r.onstart=()=>{if(this.active&&token===this.generation)this.d.update('listening')};
  r.onresult=event=>{if(!this.active||token!==this.generation||result)return;const text=event.results[0]?.[0]?.transcript?.trim();if(text){result=true;this.silence=0;this.answer(text)}};
  r.onerror=event=>{if(!this.active||token!==this.generation)return;failed=true;
   if(event.error==='no-speech'){this.clear();if(++this.silence<3)this.later(()=>this.listen());else this.fail('لم أسمع سؤالًا. اضغط استئناف عندما تكون جاهزًا.');return}
   const messages:Record<string,string>={'not-allowed':'لم يُسمح باستخدام الميكروفون. يمكنك الكتابة أو السماح له من إعدادات المتصفح.','service-not-allowed':'خدمة التعرف على الكلام غير متاحة هنا.','audio-capture':'لم نجد ميكروفونًا متاحًا.','network':'تعذر الاتصال بخدمة الكلام في المتصفح. تحقق من الإنترنت ثم استأنف.','language-not-supported':'التعرف على العربية غير متاح في هذا الجهاز.'};
   this.fail(messages[event.error]||'توقفت خدمة الكلام. يمكنك استئنافها أو استخدام الكتابة.');
  };
  r.onend=()=>{if(!this.active||token!==this.generation||result||failed)return;this.clear();if(++this.silence<3)this.later(()=>this.listen());else this.fail('توقف الاستماع. اضغط استئناف عندما تكون جاهزًا.')};
  try{this.d.update('listening');r.start()}catch{this.fail('تعذر بدء الميكروفون. اضغط استئناف أو استخدم الكتابة.')}
 }
 answer(text:string,voiceLoop=this.active){
  this.generation++;this.clear();this.d.cancelSpeech();this.d.update('thinking');
  const reply=this.d.reply(text);this.say(reply,voiceLoop);
 }
 private say(text:string,voiceLoop:boolean){
  this.generation++;this.clear();this.d.cancelSpeech();this.active=voiceLoop;
  const token=this.generation;this.d.update('speaking');
  const success=this.d.speak(text,{onStart:()=>{if(token===this.generation)this.d.update('speaking')},onEnd:()=>{if(token!==this.generation)return;if(this.active)this.later(()=>this.listen());else this.d.update('idle')},onError:()=>{if(token===this.generation)this.fail('تعذر تشغيل الصوت. اضغط على صورتي لإغلاق المحادثة ثم حاول مرة أخرى.')}});
  if(!success&&token===this.generation)this.fail('تعذر تجهيز الصوت. يمكنك استخدام الكتابة من الخيارات.');
 }
}
