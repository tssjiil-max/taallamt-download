import {SoundTouch,SimpleFilter} from 'soundtouchjs';
export const VOICE_PITCH=1.12,VOICE_SPEED=0.96;
// Independent WSOLA time stretching and resampling, never playbackRate alone.
// Pad the filter input to flush the final consonant; trim to the intended duration.
export function transformVoice(input:Float32Array,sampleRate:number):Float32Array{
 if(!input.length||sampleRate<8000||sampleRate>96000||input.length>sampleRate*45)throw Error('AUDIO_INPUT_INVALID');
 const pipe=new SoundTouch();pipe.stretch.setParameters(sampleRate,40,15,8);pipe.pitch=VOICE_PITCH;pipe.tempo=VOICE_SPEED;
 const filter=new SimpleFilter({extract(target,frames,position){
  const n=Math.min(frames,Math.max(0,input.length+32768-position));
  for(let i=0;i<n;i++){const sample=input[position+i]||0;target[i*2]=sample;target[i*2+1]=sample}return n;
 }},pipe);
 const output=new Float32Array(Math.ceil(input.length/VOICE_SPEED)),block=new Float32Array(4096*2);let offset=0;
 while(offset<output.length){const n=filter.extract(block,Math.min(4096,output.length-offset));if(!n)throw Error('AUDIO_TRANSFORM_INCOMPLETE');for(let i=0;i<n;i++)output[offset+i]=Math.max(-1,Math.min(1,block[i*2]));offset+=n}
 return output;
}
