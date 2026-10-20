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
export async function playRemoteAudio(blob:Blob,signal:AbortSignal,started:()=>void):Promise<void>{
 if(context){
  const buffer=await context.decodeAudioData(await blob.arrayBuffer());
  if(signal.aborted)throw Error('CANCELLED');
  await context.resume();if(context.state!=='running')throw Error('AUDIO_BLOCKED');
  return new Promise((resolve,reject)=>{
   const node=context!.createBufferSource();source=node;node.buffer=buffer;node.connect(context!.destination);
   const abort=()=>{node.onended=null;try{node.stop()}catch{}node.disconnect();if(source===node)source=null;reject(Error('CANCELLED'))};
   signal.addEventListener('abort',abort,{once:true});
   node.onended=()=>{signal.removeEventListener('abort',abort);node.disconnect();if(source===node)source=null;resolve()};
   node.start();started();
  });
 }
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(blob),audio=new Audio(url);audio.dataset.shakVoice='1';
  const cleanup=()=>{signal.removeEventListener('abort',abort);audio.onplaying=audio.onended=audio.onerror=null;audio.pause();audio.removeAttribute('src');URL.revokeObjectURL(url)};
  const abort=()=>{cleanup();reject(Error('CANCELLED'))};signal.addEventListener('abort',abort,{once:true});
  audio.onplaying=started;audio.onended=()=>{cleanup();resolve()};audio.onerror=()=>{cleanup();reject(Error('AUDIO_DECODE_FAILED'))};
  audio.play().catch(e=>{cleanup();reject(e)});
 });
}
