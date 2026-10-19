// Keep the exact educational vowels, including كَسْرَتَيْنِ. Device voices require
// a human listening check; successful playback is not pronunciation verification.
export const prepareArabicSpeech=(text:string)=>text.normalize('NFC');
export function pickArabicVoice():SpeechSynthesisVoice|null{
  if(typeof speechSynthesis==='undefined')return null;
  const voices=speechSynthesis.getVoices();
  return voices.find(v=>/^ar[-_]SA$/i.test(v.lang))||voices.find(v=>/^ar\b/i.test(v.lang))||null;
}
export function speakArabic(text:string,handlers?:{onStart?:()=>void;onEnd?:()=>void;onError?:()=>void}):boolean{
  if(typeof speechSynthesis==='undefined'){handlers?.onError?.();return false}
  const voice=pickArabicVoice();
  if(!voice){handlers?.onError?.();return false}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(prepareArabicSpeech(text));u.lang=voice.lang;u.voice=voice;u.rate=.9;
    u.onstart=()=>handlers?.onStart?.();u.onend=()=>handlers?.onEnd?.();u.onerror=()=>handlers?.onError?.();
    speechSynthesis.speak(u);return true;
  }catch{handlers?.onError?.();return false}
}
