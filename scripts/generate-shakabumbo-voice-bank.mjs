// Offline authoring only. No TTS server or model is deployed to students.
// Engine source: Oddadmix/nabra-tts @16b5281ce61993df3526740990cf845a3f3036f4.
// Model: oddadmix/Nabra-7M-Distill-ONNX @bbac0f1e6b001bfae89871be366a4b000180deb2.
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {FOUNDATION_CONTENT} from '../server/foundation-content.js';
import {DEMO_TARGETS} from '../server/learning-pilot-demo.js';
const engineRoot=process.argv[2],modelRoot=process.argv[3];
if(!engineRoot||!modelRoot)throw new Error('Usage: node scripts/generate-shakabumbo-voice-bank.mjs /path/to/nabra-tts /path/to/model-directory');
const require=createRequire(pathToFileURL(resolve(engineRoot,'package.json')));
const {build}=await import(pathToFileURL(require.resolve('esbuild')).href);
const {NabraTTS}=await import(pathToFileURL(resolve(engineRoot,'dist/index.js')).href);
const bundled=await build({entryPoints:['src/app/shakabumbo/phrases.ts'],bundle:true,format:'esm',platform:'node',write:false});
const phrases=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const texts=new Set([...Object.values(phrases),'كَسْرَتَيْنِ','وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ!','نحاول الوصول إلى الإجابة معًا.','ما الخطوة الأولى التي ستجربها؟','جرّب هذه الخطوة، ثم تحقق من إجابتك في التدريب.','التنوين بالكسرة علامتان أسفل الحرف الأخير، وننطق معهما نونًا ساكنة عند الوصل. مثل: كِتَابٍ.','ما موضع علامتَي التنوين في كلمة كِتَابٍ؟','انظر إلى أسفل الحرف الأخير من الكلمة.']);
// Only public explanation/prompt/hint fields. Never serialize hidden answer keys.
for(const target of [...FOUNDATION_CONTENT,...DEMO_TARGETS]){texts.add(target.title);texts.add(target.learning.explanation);for(const q of target.learning.questions||[]){if(q.prompt)texts.add(q.prompt);if(q.hint)texts.add(q.hint)}}
const server=createServer((req,res)=>{const file=req.url==='/model.onnx'?'onnx/model.onnx':req.url==='/voice.bin'?'voices/af_msa.bin':null;if(!file){res.statusCode=404;res.end();return}res.end(readFileSync(resolve(modelRoot,file)))});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const wasmPaths=pathToFileURL(dirname(require.resolve('onnxruntime-web'))+'/').href;
const tts=await NabraTTS.load({worker:false,device:'wasm',dtype:'fp32',cache:false,modelUrl:base+'/model.onnx',voiceUrl:base+'/voice.bin',wasmPaths});
const out='public/shakabumbo/voice';mkdirSync(out,{recursive:true});const manifest={},qa=[];
try{
 for(const input of texts){const text=input.normalize('NFC').trim();if(!text)continue;const id=text===phrases.WELCOME?'welcome':createHash('sha256').update(text).digest('hex').slice(0,14),path=`${out}/${id}.mp3`;
  if(!existsSync(path)||statSync(path).size<512){
   const {audio,sampleRate}=await tts.generate(text);
   if(!audio.length||!audio.every(Number.isFinite))throw new Error(`Invalid waveform: ${id}`);
   const temp=`/tmp/shakabumbo-${id}.wav`;writeFileSync(temp,Buffer.from(await tts.toWav(audio).arrayBuffer()));
   for(let attempt=0;attempt<2;attempt++){execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-i',temp,'-codec:a','libmp3lame','-b:a','40k','-ar','24000',path]);if(existsSync(path)&&statSync(path).size>=512)break;}
   if(!existsSync(path)||statSync(path).size<512)throw new Error(`Empty MP3: ${id}`);
   qa.push({id,seconds:Number((audio.length/sampleRate).toFixed(2)),finite:true});
  }
  manifest[text]=`/shakabumbo/voice/${id}.mp3`;
 }
 const phonemes=await tts.phonemize('كَسْرَتَيْنِ');
 writeFileSync('src/app/shakabumbo/voice-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 writeFileSync('docs/shakabumbo-voice-waveform-qa.json',JSON.stringify({engine:'Nabra-7M-Distill',engineRevision:'16b5281ce61993df3526740990cf845a3f3036f4',modelRevision:'bbac0f1e6b001bfae89871be366a4b000180deb2',kasrataynPhonemes:phonemes,files:qa,note:'Waveform/phoneme verification; not a human pronunciation approval.'},null,2)+'\n');
 console.log(JSON.stringify({clips:Object.keys(manifest).length,kasrataynPhonemes:phonemes}));
}finally{await tts.dispose();server.close()}
