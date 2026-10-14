import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const assetPath=fileURLToPath(new URL('./ocr-assets/',import.meta.url));
const dataUrl=bytes=>'data:image/jpeg;base64,'+bytes.toString('base64');
export const visualRevision=target=>createHash('sha256').update(JSON.stringify({subject:target?.subject,learning:target?.learning})).digest('hex');
export function compareVisualAnswer(question,answer){
 const normalize=value=>{let text=String(value??'').normalize('NFC').trim().replace(/\s+/g,' ');if(question.ignoreDiacritics===true&&question.diacritics!==true&&!/تنوين|تشكيل|حركات|حركة|اضبط|ضبط/.test(String(question.prompt||'')))text=text.replace(/[\u064b-\u0652\u0670]/g,'');return text};
 return (question.answers||[]).some(value=>normalize(value)===normalize(answer));
}
export function validateRegions(regions){
 if(!Array.isArray(regions)||!regions.length||regions.length>8)throw Error('REGIONS_INVALID');
 const seen=new Set();
 return regions.map(r=>{if(!r||typeof r.questionId!=='string'||!/^[A-Za-z0-9:_-]{1,80}$/.test(r.questionId)||seen.has(r.questionId))throw Error('REGIONS_INVALID');seen.add(r.questionId);
 for(const k of ['x','y','width','height'])if(typeof r[k]!=='number'||!Number.isFinite(r[k]))throw Error('REGIONS_INVALID');
 if(r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>1||r.y+r.height>1)throw Error('REGIONS_INVALID');
 return {questionId:r.questionId,x:r.x,y:r.y,width:r.width,height:r.height};});
}
// No network fallback: model and WASM core must exist in the server bundle.
export async function localArabicReader(){
 const {createWorker,OEM,PSM}=await import('tesseract.js');
 const expected=(await readFile(assetPath+'SHA256SUMS','utf8')).trim().split(/\s+/)[0];
 if(createHash('sha256').update(await readFile(assetPath+'ara.traineddata')).digest('hex')!==expected)throw Error('OCR_ASSET_MISMATCH');
 const worker=await createWorker('ara',OEM.LSTM_ONLY,{langPath:assetPath,gzip:false,cacheMethod:'none',corePath:require.resolve('tesseract.js-core'),logger:()=>{},errorHandler:()=>{}});
 await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK,preserve_interword_spaces:'1',user_defined_dpi:'300'});
 return {read:async bytes=>{const {data}=await worker.recognize(bytes);return {text:String(data.text||'').trim().slice(0,2000),confidence:Number.isFinite(data.confidence)?data.confidence:null}},close:()=>worker.terminate()};
}
export async function processVisualPhoto(image,{regions,readerFactory=localArabicReader,budgetMs=20000}={}){
 if(typeof image!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>280000)throw Error('PHOTO_INVALID');
 const bytes=Buffer.from(image.split(',')[1],'base64');
 const base=sharp(bytes,{limitInputPixels:4000000});const metadata=await base.metadata();
 if(metadata.format!=='jpeg'||!metadata.width||!metadata.height)throw Error('PHOTO_INVALID');
 const oriented=await base.rotate().removeAlpha().toColourspace('srgb').resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
 const {width,height,channels}=oriented.info;
 const raw=oriented.data,masked=Buffer.from(raw);let redPixels=0;
 // Mask for recognition only. Original and colour crops remain intact for reviewing overlap.
 for(let i=0;i<raw.length;i+=channels){const r=raw[i],g=raw[i+1],b=raw[i+2];if(r>100&&r>g*1.4&&r>b*1.35&&r-Math.max(g,b)>40){masked[i]=masked[i+1]=masked[i+2]=255;redPixels++;}}
 const corrected=await sharp(raw,{raw:{width,height,channels}}).jpeg({quality:70}).toBuffer();
 const layout=regions?validateRegions(regions):[{questionId:'unassigned',x:0,y:0,width:1,height:1}];
 let reader;const readings=[];let failure=null;const deadline=Date.now()+Math.max(10,Math.min(20000,budgetMs));
 const bounded=async(promise,ms)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('OCR_TIMEOUT')),Math.max(1,ms))})])}finally{clearTimeout(timer)}};
 let timedOut=false;
 const initializing=readerFactory();
 initializing.then(late=>{if(timedOut)late.close().catch(()=>{})},()=>{});
 try{reader=await bounded(initializing,Math.min(8000,deadline-Date.now()))}catch(e){timedOut=true;failure=e.message==='OCR_TIMEOUT'?'OCR_TIMEOUT':'LOCAL_OCR_UNAVAILABLE'}
 try{
 for(const region of layout){
 const left=Math.min(width-1,Math.floor(region.x*width)),top=Math.min(height-1,Math.floor(region.y*height));
 const box={left,top,width:Math.max(1,Math.min(width-left,Math.floor(region.width*width))),height:Math.max(1,Math.min(height-top,Math.floor(region.height*height)))};
 const crop=await sharp(raw,{raw:{width,height,channels}}).extract(box).resize({width:700,height:500,fit:'inside',withoutEnlargement:true}).jpeg({quality:60}).toBuffer();
 const recognitionCrop=await sharp(masked,{raw:{width,height,channels}}).extract(box).greyscale().normalise({lower:0,upper:100}).png().toBuffer();
 let result={text:'',confidence:null};let reason=failure;
 if(reader){try{result=await bounded(reader.read(recognitionCrop),Math.min(6000,deadline-Date.now()))}catch(e){reason=e.message==='OCR_TIMEOUT'?'OCR_TIMEOUT':'OCR_READ_FAILED'}}
 readings.push({questionId:region.questionId,region,box,crop:dataUrl(crop),text:String(result.text||'').slice(0,2000),confidence:{value:Number.isFinite(result.confidence)?result.confidence:null,scale:'0-100',source:'tesseract-lstm-engine',calibrated:false},status:'needs_teacher_review',reason:reason||(!result.text?'UNREADABLE':regions?'UNCALIBRATED_HANDWRITING':'ANSWER_REGIONS_NOT_VERIFIED')});
 }
 }finally{if(reader)await reader.close()}
 const report={version:1,engine:'tesseract.js-7/ara-tessdata-fast-4.1.0',imageHash:createHash('sha256').update(bytes).digest('hex'),correctedImage:dataUrl(corrected),width,height,redPixels,redOverlapRequiresReview:redPixels>0,layoutVerified:!!regions,paperDetection:'not_implemented',perspectiveCorrection:'not_implemented',printedHandwrittenSeparation:'teacher_regions_required',readings,academicScore:null,starGranted:false,status:'needs_teacher_review',reasons:[...(failure?[failure]:[]),...(!regions?['ANSWER_REGIONS_NOT_VERIFIED']:[]),'HANDWRITING_CONFIDENCE_NOT_CALIBRATED',...(redPixels?['RED_INK_OVERLAP_REQUIRES_REVIEW']:[])]};
 if(Buffer.byteLength(JSON.stringify(report))>560000){
   report.reasons.push('REVIEW_IMAGES_DOWNSCALED_FOR_DOCUMENT_BUDGET');
   report.correctedImage=dataUrl(await sharp(corrected).resize({width:700,height:700,fit:'inside'}).jpeg({quality:40}).toBuffer());
   for(const row of report.readings)row.crop=dataUrl(await sharp(Buffer.from(row.crop.split(',')[1],'base64')).resize({width:350,height:250,fit:'inside'}).jpeg({quality:35}).toBuffer());
 }
 if(Buffer.byteLength(JSON.stringify(report))>560000)throw Error('REPORT_SIZE_LIMIT');
 return report;
}
