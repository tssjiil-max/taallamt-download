import {describe,it,expect,vi,afterEach} from 'vitest';
import {VoiceSession,stopActiveVoiceSession,type RecognitionLike} from './voice-session';
import {prepareArabicSpeech} from './speak';
import {tutorRespond} from './tutor';
function fixture(){
 vi.useFakeTimers();const records:RecognitionLike[]=[];const update=vi.fn(),cancelSpeech=vi.fn();let callbacks:{onStart:()=>void;onEnd:()=>void;onError:()=>void};
 const speak=vi.fn((_text:string,h:typeof callbacks)=>{callbacks=h;h.onStart();return true});
 const session=new VoiceSession({recognition:()=>{const r={start:vi.fn(),abort:vi.fn(),onstart:null,onend:null,onerror:null,onresult:null} as unknown as RecognitionLike;records.push(r);return r},speak,cancelSpeech,reply:vi.fn(()=> 'شرح معتمد'),update});
 return{session,records,update,speak,cancelSpeech,end:()=>callbacks.onEnd()};
}
afterEach(()=>{stopActiveVoiceSession();vi.useRealTimers()});
describe('free voice turn lifecycle',()=>{
 it('plays the greeting before opening the microphone',()=>{const f=fixture();f.session.start('السلام عليكم');expect(f.speak).toHaveBeenCalledWith('السلام عليكم',expect.any(Object));expect(f.records).toHaveLength(0);f.end();vi.advanceTimersByTime(500);expect(f.records).toHaveLength(1)});
 it('a second tap stops the greeting without ever opening the microphone',()=>{const f=fixture();f.session.start('السلام عليكم');f.session.stop();f.end();vi.runAllTimers();expect(f.records).toHaveLength(0)});
 it('aborts input before output and resumes only after output finishes',()=>{const f=fixture();f.session.start();const r=f.records[0];r.onresult!({results:[[{transcript:'اشرح'}]]});expect(r.abort).toHaveBeenCalled();expect(f.records).toHaveLength(1);vi.runAllTimers();expect(f.records).toHaveLength(1);f.end();vi.advanceTimersByTime(500);expect(f.records).toHaveLength(2)});
 it('rejects a late speech callback after closing, muting or Quran',()=>{const f=fixture();f.session.start();f.records[0].onresult!({results:[[{transcript:'اشرح'}]]});f.session.stop('muted');f.end();vi.runAllTimers();expect(f.records).toHaveLength(1);expect(f.update).toHaveBeenLastCalledWith('muted')});
 it('ignores recognition results after stop',()=>{const f=fixture();f.session.start();const late=f.records[0].onresult!;f.session.stop();late({results:[[{transcript:'متأخر'}]]});expect(f.speak).not.toHaveBeenCalled()});
 it('does not loop permission failures',()=>{const f=fixture();f.session.start();f.records[0].onerror!({error:'not-allowed'});vi.runAllTimers();expect(f.records).toHaveLength(1);expect(f.update).toHaveBeenLastCalledWith('error',expect.stringContaining('الميكروفون'))});
 it('restarts after silence with a bounded retry count',()=>{const f=fixture();f.session.start();for(let i=0;i<3;i++){f.records[i].onend!();vi.runAllTimers()}expect(f.records).toHaveLength(3);expect(f.update).toHaveBeenLastCalledWith('error',expect.any(String))});
 it('does not resume when speech fails',()=>{const f=fixture();f.speak.mockReturnValue(false);f.session.start();f.records[0].onresult!({results:[[{transcript:'اشرح'}]]});vi.runAllTimers();expect(f.records).toHaveLength(1);expect(f.update).toHaveBeenLastCalledWith('error',expect.any(String))});
 it('reads typed text once without opening microphone',()=>{const f=fixture();f.session.answer('سؤال',false);f.end();vi.runAllTimers();expect(f.records).toHaveLength(0)});
});
describe('educational content',()=>{
 it('preserves kasratayn and other educational vowels exactly',()=>expect(prepareArabicSpeech('كَسْرَتَيْنِ')).toBe('كَسْرَتَيْنِ'));
 const ctx={subject:'spelling',subjectLabel:'الإملاء',title:'التنوين',prompt:'سؤال مشكّل',explanation:'شرح معتمد',hint:'تلميح معتمد'};
 it('blocks hints and explanations during assessment',()=>{expect(tutorRespond('اعطني الجواب',{...ctx,assessment:true},0).reply).not.toContain('تلميح معتمد');expect(tutorRespond('اشرح',{...ctx,assessment:true},0).reply).not.toContain('شرح معتمد')});
 it('reads the current question unchanged',()=>expect(tutorRespond('اقرأ السؤال',ctx,0).reply).toBe(ctx.prompt));
 it('uses current lesson explanation on follow-up',()=>expect(tutorRespond('ما فهمت اشرح مرة ثانية',ctx,1).reply).toContain('شرح معتمد'));
 it('provides exactly the test word without replacing its vowels',()=>expect(tutorRespond('اقرأ كلمة كَسْرَتَيْنِ',ctx,0).reply).toBe('كَسْرَتَيْنِ'));
});

describe('P0 exclusive voice ownership',()=>{
 it('runs three sequential rounds with no listening during any reply',()=>{
  const f=fixture();f.session.start();
  for(let i=0;i<3;i++){
   const r=f.records[i];expect(r.lang).toBe('ar-SA');
   r.onresult!({results:[[{transcript:'اقرأ السؤال'}]]});
   expect(r.abort).toHaveBeenCalledOnce();expect(f.records).toHaveLength(i+1);
   vi.advanceTimersByTime(2000);expect(f.records).toHaveLength(i+1);
   f.end();vi.advanceTimersByTime(500);expect(f.records).toHaveLength(i+2);
  }
  const last=f.records[3];f.session.stop();expect(last.abort).toHaveBeenCalledOnce();
  vi.runAllTimers();expect(f.records).toHaveLength(4);
 });
 it('only accepts a single completion callback per reply',()=>{const f=fixture();f.session.start('مرحبا');f.end();f.end();vi.runAllTimers();expect(f.records).toHaveLength(1)});
 it('starting a second session releases the previous microphone',()=>{const a=fixture(),b=fixture();a.session.start();const late=a.records[0].onresult!;b.session.start();expect(a.records[0].abort).toHaveBeenCalledOnce();late({results:[[{transcript:'اشرح'}]]});expect(a.speak).not.toHaveBeenCalled();b.session.stop()});
 it('external read-aloud or Quran can synchronously release the active microphone',()=>{const f=fixture();f.session.start();stopActiveVoiceSession();expect(f.records[0].abort).toHaveBeenCalledOnce();expect(f.update).toHaveBeenLastCalledWith('idle')});
 it('reports unsupported speech recognition without retries',()=>{vi.useFakeTimers();const update=vi.fn();const session=new VoiceSession({recognition:()=>null,speak:()=>false,cancelSpeech:vi.fn(),reply:()=>'',update});session.start();vi.runAllTimers();expect(update).toHaveBeenLastCalledWith('error',expect.stringContaining('غير مدعوم'))});
});

describe('Quran tutor boundary',()=>{it('never returns verse text through the tutor read request',()=>{const verse='نص آية لا يرسل للصوت الاصطناعي';expect(tutorRespond('اقرأ السؤال',{subject:'quran',subjectLabel:'القرآن',title:'التلاوة',prompt:verse},0).reply).not.toContain(verse)})});

describe('voice ownership cleanup',()=>{it('cleanup of the old component cannot cancel the new owner speech',()=>{const a=fixture(),b=fixture();a.session.start();b.session.start('السلام عليكم');a.cancelSpeech.mockClear();a.session.stop();expect(a.cancelSpeech).not.toHaveBeenCalled();b.session.stop()})});

describe('asynchronous curriculum model',()=>{
 it('discards a model reply received after closing',async()=>{let resolve!:(value:string)=>void;const speak=vi.fn(()=>true),update=vi.fn();const session=new VoiceSession({recognition:()=>null,speak,cancelSpeech:vi.fn(),reply:()=>new Promise<string>(r=>{resolve=r}),update});session.answer('سؤال',false);expect(update).toHaveBeenLastCalledWith('thinking');session.stop();resolve('جواب متأخر');await Promise.resolve();expect(speak).not.toHaveBeenCalled()});
 it('speaks the actual resolved model answer',async()=>{const speak=vi.fn(()=>true);const session=new VoiceSession({recognition:()=>null,speak,cancelSpeech:vi.fn(),reply:async()=> 'الجواب من الدرس',update:vi.fn()});session.answer('سؤال',false);await Promise.resolve();expect(speak).toHaveBeenCalledWith('الجواب من الدرس',expect.any(Object));session.stop()});
});

describe('truthful audio and microphone phases',()=>{
 it('waits for actual playback and actual recognition start',()=>{
  const f=fixture();let h:any;f.speak.mockImplementation((_text,handlers)=>{h=handlers;return true});
  f.session.start('مرحبا');expect(f.update).toHaveBeenLastCalledWith('generating-audio');
  h.onStart();expect(f.update).toHaveBeenLastCalledWith('speaking');h.onEnd();vi.advanceTimersByTime(500);
  expect(f.update).toHaveBeenLastCalledWith('requesting-permission');f.records[0].onstart!();expect(f.update).toHaveBeenLastCalledWith('listening');
 });
});
