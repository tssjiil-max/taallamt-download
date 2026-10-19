import {describe,it,expect,vi,afterEach} from 'vitest';
import {VoiceSession,type RecognitionLike} from './voice-session';
import {prepareArabicSpeech} from './speak';
import {tutorRespond} from './tutor';
function fixture(){
 vi.useFakeTimers();const records:RecognitionLike[]=[];const update=vi.fn(),cancelSpeech=vi.fn();let callbacks:{onStart:()=>void;onEnd:()=>void;onError:()=>void};
 const speak=vi.fn((_text:string,h:typeof callbacks)=>{callbacks=h;h.onStart();return true});
 const session=new VoiceSession({recognition:()=>{const r={start:vi.fn(),abort:vi.fn(),onstart:null,onend:null,onerror:null,onresult:null} as unknown as RecognitionLike;records.push(r);return r},speak,cancelSpeech,reply:vi.fn(()=> 'شرح معتمد'),update});
 return{session,records,update,speak,end:()=>callbacks.onEnd()};
}
afterEach(()=>vi.useRealTimers());
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
