import {transformVoice} from './voice-transform';
self.onmessage=(event:MessageEvent<{samples:Float32Array;sampleRate:number}>)=>{
 try{const samples=transformVoice(event.data.samples,event.data.sampleRate);self.postMessage({samples}, {transfer:[samples.buffer]})}
 catch{self.postMessage({error:'AUDIO_TRANSFORM_FAILED'})}
};
