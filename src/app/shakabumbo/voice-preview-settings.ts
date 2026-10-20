export const VOICES=[{id:'lulwa',name:'لولوة'},{id:'noura',name:'نورة'},{id:'aisha',name:'عائشة'}] as const;
export type PreviewVoice=typeof VOICES[number]['id'];
export type VoiceOptions={pitch:number;speed:number;processed:boolean};
export const ORIGINAL:VoiceOptions={pitch:1,speed:1,processed:false};
export const PREVIEW_DEFAULT:VoiceOptions={pitch:1.08,speed:.98,processed:true};
export function validOptions(v:VoiceOptions){return Number.isFinite(v.pitch)&&Number.isFinite(v.speed)&&v.pitch>=1.04&&v.pitch<=1.16&&v.speed>=.94&&v.speed<=1.02&&typeof v.processed==='boolean'}
export function readPreviewVoice():({voice:PreviewVoice}&VoiceOptions)|null{
 try{const v=JSON.parse(sessionStorage.getItem('shak-preview-voice')||'null');return v&&VOICES.some(x=>x.id===v.voice)&&validOptions(v)?v:null}catch{return null}
}
export function adoptPreviewVoice(voice:PreviewVoice,options:VoiceOptions){
 if(!VOICES.some(x=>x.id===voice)||!validOptions(options))throw Error('VOICE_OPTIONS_INVALID');
 sessionStorage.setItem('shak-preview-voice',JSON.stringify({voice,...options}));
}
