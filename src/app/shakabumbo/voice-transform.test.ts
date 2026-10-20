import {it,expect} from 'vitest';
import {transformVoice,VOICE_PITCH,VOICE_SPEED} from './voice-transform';
it('raises pitch by 1.12 independently of 0.96 speed',()=>{
 const rate=24000,input=Float32Array.from({length:rate*2},(_,i)=>.3*Math.sin(2*Math.PI*400*i/rate));const result=transformVoice(input,rate);
 expect(result.length).toBe(Math.ceil(input.length/VOICE_SPEED));let crossings=0;const a=rate/2,b=rate*1.5;
 for(let i=a+1;i<b;i++)if(result[i-1]<=0&&result[i]>0)crossings++;
 expect(crossings).toBeCloseTo(400*VOICE_PITCH,-1);expect(result.every(Number.isFinite)).toBe(true);
});
it('rejects empty and oversized audio instead of silently using an old voice',()=>{expect(()=>transformVoice(new Float32Array(),24000)).toThrow();expect(()=>transformVoice(new Float32Array(24000*46),24000)).toThrow()});
