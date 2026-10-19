import{beforeEach,afterEach,describe,it,expect,vi}from'vitest';
import{speakArabic,cancelArabicSpeech,speechSegments}from'./speak';
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
