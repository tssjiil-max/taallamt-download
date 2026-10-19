// Shared Arabic text-to-speech for Shakabumbo. Two real, verifiable fixes for the
// mispronunciation the student actually heard (e.g. «كَسْرَتَيْنِ» coming out with the wrong
// vowel on the first letter):
//
// 1. Strip tashkeel (diacritics) before handing text to the browser's speech engine.
//    Most ar-SA voices mispronounce heavily-diacritized grammar/spelling terms — they are
//    built to pronounce plain Arabic script using their own built-in lexicon and rules, and
//    a per-letter diacritic can force the wrong grapheme-to-phoneme mapping on exactly the
//    kind of short grammar terms (كسرتين، فتحة، ضمة، سكون، تنوين) this app teaches. The
//    diacritics stay in the text shown on screen; only what is sent to the speech engine is
//    stripped.
// 2. Explicitly pick an Arabic voice when one is installed, instead of trusting the
//    browser's default voice — a default English voice reading Arabic script letter-by-letter
//    is the single most common cause of an Arabic word sounding completely wrong.
//
// This cannot guarantee every phone/browser's built-in Arabic voice pronounces every word
// correctly — that voice is outside this app's control — but these two changes fix the
// specific, verifiable failure mode reported, with no new paid service required.
export function stripTashkeelForSpeech(text:string):string{
  return text
    .normalize('NFKD')
    .replace(/[ً-ٰٟۖ-ۭ]/g,'') // fatha..sukun, small high marks
    .replace(/ـ/g,''); // tatweel/kashida, which some engines also stumble on
}

let cachedArabicVoice:SpeechSynthesisVoice|null|undefined;

function pickArabicVoice():SpeechSynthesisVoice|null{
  if(typeof speechSynthesis==='undefined')return null;
  if(cachedArabicVoice!==undefined)return cachedArabicVoice;
  const voices=speechSynthesis.getVoices();
  cachedArabicVoice=voices.find(v=>v.lang?.toLowerCase().startsWith('ar'))||null;
  return cachedArabicVoice;
}

// Voice lists load asynchronously on first page interaction in some browsers; refresh the
// cache once they arrive instead of staying stuck with "no Arabic voice yet".
if(typeof speechSynthesis!=='undefined'){
  speechSynthesis.addEventListener?.('voiceschanged',()=>{cachedArabicVoice=undefined});
}

export function speakArabic(text:string,handlers?:{onStart?:()=>void;onEnd?:()=>void;onError?:()=>void}):boolean{
  if(typeof speechSynthesis==='undefined')return false;
  try{
    speechSynthesis.cancel();
    const utterance=new SpeechSynthesisUtterance(stripTashkeelForSpeech(text));
    utterance.lang='ar-SA';
    utterance.rate=0.9;
    const voice=pickArabicVoice();
    if(voice)utterance.voice=voice;
    utterance.onstart=()=>handlers?.onStart?.();
    utterance.onend=()=>handlers?.onEnd?.();
    utterance.onerror=()=>handlers?.onError?.();
    speechSynthesis.speak(utterance);
    return true;
  }catch{
    handlers?.onError?.();
    return false;
  }
}
