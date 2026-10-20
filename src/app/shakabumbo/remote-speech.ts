// Unlock Web Audio within the image tap, before React effects or network awaits.
let context:AudioContext|null=null,source:AudioBufferSourceNode|null=null;
export function primeArabicAudio(){
 try{if(typeof AudioContext!=='undefined'){context??=new AudioContext();void context.resume().catch(()=>{})}}catch{}
}
export function stopRemoteAudio(){try{source?.stop()}catch{}source=null}
export function splitSpeech(text:string):string[]{
 const words=text.normalize('NFC').trim().split(/\s+/),chunks:string[]=[];let current='';
 for(const word of words){if(word.length>200)throw Error('TEXT_INVALID');if(current.length+word.length+1>200){chunks.push(current);current=word}else current+=(current?' ':'')+word}
 if(current)chunks.push(current);return chunks;
}
export async function prepareVoiceBuffer(buffer:AudioBuffer,signal:AbortSignal):Promise<Float32Array>{
 if(signal.aborted)throw Error('CANCELLED');
 const samples=new Float32Array(buffer.length);
 for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels}
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./voice-transform.worker.ts',import.meta.url),{type:'module'});
  const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate()};
  const abort=()=>{cleanup();reject(Error('CANCELLED'))};
  const timer=setTimeout(()=>{cleanup();reject(Error('AUDIO_TRANSFORM_TIMEOUT'))},15000);
  signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=event=>{cleanup();if(event.data.error)reject(Error('AUDIO_TRANSFORM_FAILED'));else resolve(event.data.samples)};
  worker.onerror=()=>{cleanup();reject(Error('AUDIO_TRANSFORM_FAILED'))};
  worker.postMessage({samples,sampleRate:buffer.sampleRate},[samples.buffer]);
 });
}
export async function playRemoteAudio(blob:Blob,signal:AbortSignal,started:()=>void):Promise<void>{
 primeArabicAudio();
 if(!context)throw Error('AUDIO_PROCESSING_UNSUPPORTED');
 const decoded=await context.decodeAudioData(await blob.arrayBuffer());
 const samples=await prepareVoiceBuffer(decoded,signal);
 if(signal.aborted)throw Error('CANCELLED');
 const buffer=context.createBuffer(1,samples.length,decoded.sampleRate);buffer.getChannelData(0).set(samples);
 await context.resume();if(context.state!=='running')throw Error('AUDIO_BLOCKED');
 return new Promise((resolve,reject)=>{
  const node=context!.createBufferSource();source=node;node.buffer=buffer;node.connect(context!.destination);
  const abort=()=>{node.onended=null;try{node.stop()}catch{}node.disconnect();if(source===node)source=null;reject(Error('CANCELLED'))};
  signal.addEventListener('abort',abort,{once:true});
  node.onended=()=>{signal.removeEventListener('abort',abort);node.disconnect();if(source===node)source=null;resolve()};
  node.start();started();
 });
}
