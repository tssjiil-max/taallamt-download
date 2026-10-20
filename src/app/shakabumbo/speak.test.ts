import{beforeEach,afterEach,describe,it,expect,vi}from'vitest';
import{speakArabic,cancelArabicSpeech,speechSegments}from'./speak';
import{VoiceSession,type RecognitionLike}from'./voice-session';
import{tutorRespond}from'./tutor';
import{setLessonContext}from'./context';
import{WELCOME,HELP_MENU}from'./phrases';
class FakeAudio{
 static instances:FakeAudio[]=[];src:string;dataset:Record<string,string>={};style:Record<string,string>={};onplaying:(()=>void)|null=null;onended:(()=>void)|null=null;onerror:(()=>void)|null=null;
 pause=vi.fn();remove=vi.fn();removeAttribute=vi.fn();setAttribute=vi.fn();play=vi.fn(()=>Promise.resolve());
 constructor(src:string){this.src=src;FakeAudio.instances.push(this)}
}
beforeEach(()=>{FakeAudio.instances=[];vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('document',{body:{append:vi.fn()}});vi.stubGlobal('speechSynthesis',{getVoices:()=>[],cancel:vi.fn()})});
afterEach(()=>{cancelArabicSpeech();vi.unstubAllGlobals()});
describe('authored Arabic audio independent of device voices',()=>{
 it('plays a real welcome MP3 even when no Arabic device voice exists',()=>{const onStart=vi.fn(),onEnd=vi.fn();expect(speakArabic(WELCOME,{onStart,onEnd})).toBe(true);const audio=FakeAudio.instances[0];expect(audio.src).toBe('/shakabumbo/voice/welcome.mp3');expect(audio.dataset.shakVoice).toBe('1');expect(onStart).not.toHaveBeenCalled();audio.onplaying!();expect(onStart).toHaveBeenCalledOnce();audio.onended!();expect(onEnd).toHaveBeenCalledOnce()});
 it('cancels playback and ignores a late end callback after the second tap',()=>{const end=vi.fn();speakArabic(WELCOME,{onEnd:end});const audio=FakeAudio.instances[0],late=audio.onended!;cancelArabicSpeech();late();expect(audio.pause).toHaveBeenCalled();expect(end).not.toHaveBeenCalled()});
 it('resets read-aloud UI once when playback is cancelled',()=>{const stopped=vi.fn();speakArabic(WELCOME,{onCancel:stopped});cancelArabicSpeech();cancelArabicSpeech();expect(stopped).toHaveBeenCalledOnce()});
 it('queues lesson segments instead of overlapping voices',()=>{const end=vi.fn();speakArabic(WELCOME+'\n'+HELP_MENU,{onEnd:end});expect(FakeAudio.instances).toHaveLength(1);FakeAudio.instances[0].onended!();expect(FakeAudio.instances).toHaveLength(2);expect(end).not.toHaveBeenCalled();FakeAudio.instances[1].onended!();expect(end).toHaveBeenCalledOnce()});
 it('reports an unavailable new recording instead of inventing speech success',()=>{const error=vi.fn();expect(speakArabic('محتوى جديد لم يُسجَّل بعد',{onError:error})).toBe(false);expect(error).toHaveBeenCalledOnce();expect(FakeAudio.instances).toHaveLength(0)});
 it('preserves vowels and separates authored paragraphs',()=>expect(speechSegments('كَسْرَتَيْنِ\n'+HELP_MENU)).toEqual(['كَسْرَتَيْنِ',HELP_MENU]));
});

describe('Quran and educational text boundary',()=>{
 it('never sends Quran context to device synthesis or lesson recordings',()=>{
  setLessonContext({subject:'quran',subjectLabel:'القرآن',title:'التلاوة'});
  try{expect(speakArabic(WELCOME)).toBe(false);expect(FakeAudio.instances).toHaveLength(0)}finally{setLessonContext(null)}
 });
 it.each(['كَسْرَتَيْنِ','بَ بِ بُ','كِتَابٌ كِتَابًا كِتَابٍ','قَالَ يَقُولُ قِيلَ','شَدَّةٌ'])('retains the exact educational text: %s',text=>expect(speechSegments(text)).toEqual([text]));
});

describe('device Arabic speech fallback',()=>{
 it('uses the Saudi voice and preserves educational vowels',()=>{
  const sa={lang:'ar-SA'},other={lang:'en-US'},say=vi.fn();
  vi.stubGlobal('speechSynthesis',{getVoices:()=>[other,sa],cancel:vi.fn(),speak:say});
  vi.stubGlobal('SpeechSynthesisUtterance',class{constructor(public text:string){}});
  const text='بَ بِ بُ — كِتَابٌ كِتَابًا كِتَابٍ — مَدٌّ';
  expect(speakArabic(text)).toBe(true);expect(say.mock.calls[0][0]).toMatchObject({text:text.normalize('NFC'),voice:sa,lang:'ar-SA'});expect(text).toBe('بَ بِ بُ — كِتَابٌ كِتَابًا كِتَابٍ — مَدٌّ');
 });
});

describe('voice integration: session → tutor → real audio adapter',()=>{
 it('completes three recorded replies, resumes recognition, then closes cleanly',()=>{
  vi.useFakeTimers();const input:RecognitionLike[]=[],phases:string[]=[];
  const ctx={subject:'spelling',subjectLabel:'الإملاء',title:'التنوين',prompt:HELP_MENU,explanation:WELCOME};
  const session=new VoiceSession({recognition:()=>{const r={start:vi.fn(),abort:vi.fn(),onstart:null,onresult:null,onerror:null,onend:null} as unknown as RecognitionLike;input.push(r);return r},speak:speakArabic,cancelSpeech:cancelArabicSpeech,reply:q=>tutorRespond(q,ctx,0).reply,update:p=>phases.push(p)});
  try{
   session.start();
   for(const [i,question]of ['اقرأ السؤال','انطق كلمة كسرتين','اشرح'].entries()){
    const r=input[i];r.onresult!({results:[[{transcript:question}]]});
    expect(r.abort).toHaveBeenCalledOnce();expect(phases.at(-1)).toBe('generating-audio');FakeAudio.instances.at(-1)!.onplaying!();expect(phases.at(-1)).toBe('speaking');
    let count=0;
    while(FakeAudio.instances.at(-1)?.onended){if(++count>5)throw new Error('unexpected audio loop');FakeAudio.instances.at(-1)!.onended!()}
    expect(input).toHaveLength(i+1);vi.advanceTimersByTime(500);expect(input).toHaveLength(i+2);
   }
   session.stop();expect(input[3].abort).toHaveBeenCalledOnce();vi.runAllTimers();expect(phases.at(-1)).toBe('idle');expect(input).toHaveLength(4);
  }finally{session.stop();vi.useRealTimers()}
 });
});
