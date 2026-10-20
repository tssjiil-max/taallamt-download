import {test,expect,vi,afterEach} from 'vitest';
import {splitSpeech,playRemoteAudio} from './remote-speech';
afterEach(()=>vi.unstubAllGlobals());
test('splits at provider limit while retaining every educational word and vowel',()=>{const text=('كَسْرَتَيْنِ كِتَابٍ مَدٌّ ').repeat(20).trim(),chunks=splitSpeech(text);expect(chunks.every(c=>c.length<=200)).toBe(true);expect(chunks.join(' ')).toBe(text.normalize('NFC'))});
test('unsupported processing fails explicitly rather than playing unprocessed voice',async()=>{vi.stubGlobal('AudioContext',undefined);await expect(playRemoteAudio(new Blob(['wav']),new AbortController().signal,vi.fn())).rejects.toThrow('AUDIO_PROCESSING_UNSUPPORTED')});
test('closing during processing terminates the worker without starting sound',async()=>{
 const terminate=vi.fn();vi.stubGlobal('Worker',class{terminate=terminate;postMessage=vi.fn()});
 const abort=new AbortController();const {prepareVoiceBuffer}=await import('./remote-speech');
 const buffer={length:4,numberOfChannels:1,sampleRate:24000,getChannelData:()=>new Float32Array(4)} as unknown as AudioBuffer;
 const result=prepareVoiceBuffer(buffer,abort.signal);abort.abort();await expect(result).rejects.toThrow('CANCELLED');expect(terminate).toHaveBeenCalledOnce();
});
