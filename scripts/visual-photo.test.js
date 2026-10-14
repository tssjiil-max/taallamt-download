import {test,expect} from 'vitest';
import {compareVisualAnswer,validateRegions} from '../server/visual-photo.js';
test('strict visual comparison preserves tanwin and letter identities',()=>{
 expect(compareVisualAnswer({answers:['صديقٍ'],diacritics:true},'صديق')).toBe(false);
 expect(compareVisualAnswer({answers:['صديقٍ'],diacritics:true},'صديقٍ')).toBe(true);
 expect(compareVisualAnswer({answers:['صديقٍ'],prompt:'اكتب مع تنوين الكسر',ignoreDiacritics:true},'صديق')).toBe(false);
 expect(compareVisualAnswer({answers:['على']},'علي')).toBe(false);
 expect(compareVisualAnswer({answers:['فتاة']},'فتاه')).toBe(false);
});
test('ROI rejects invalid bounds, duplicate question ids and unbounded work',()=>{
 for(const regions of [[{questionId:'q',x:-1,y:0,width:1,height:1}],[{questionId:'q',x:0,y:0,width:.2,height:.2},{questionId:'q',x:0,y:0,width:.2,height:.2}],Array(9).fill({questionId:'q',x:0,y:0,width:1,height:1})])expect(()=>validateRegions(regions)).toThrow();
 expect(validateRegions([{questionId:'q',x:0,y:0,width:1,height:1}])).toHaveLength(1);
});
import {evaluateVerifiedPhotoAnswers} from '../server/photo-review-score.js';
test('unreadable answer is unresolved, not wrong, weighted estimate has explicit range',()=>{
 const r=evaluateVerifiedPhotoAnswers([{answers:['أ'],points:2},{answers:['ب'],points:3}],['أ',null]);
 expect(r.estimatedScore).toBe(null);expect(r.scoreRange).toEqual({min:40,max:100});expect(r.eligibleForStar).toBe(false);expect(r.items[1].status).toBe('needs_review');
});
test('missing key cannot issue a score or star',()=>{const r=evaluateVerifiedPhotoAnswers([{answers:[]}],['أ']);expect(r.estimatedScore).toBe(null);expect(r.items[0].status).toBe('no_approved_key')});
import sharp from 'sharp';
import {processVisualPhoto} from '../server/visual-photo.js';
test('real image pixels mask red only for reading and preserve source colour crop',async()=>{
 const bytes=await sharp({create:{width:100,height:100,channels:3,background:{r:200,g:10,b:10}}}).jpeg().toBuffer();
 let seen;
 const report=await processVisualPhoto('data:image/jpeg;base64,'+bytes.toString('base64'),{regions:[{questionId:'q',x:0,y:0,width:1,height:1}],readerFactory:async()=>({read:async bytes=>{seen=await sharp(bytes).stats();return {text:'صديق',confidence:95}},close:async()=>{}})});
 expect(report.redPixels).toBe(10000);expect(seen.channels[0].min).toBe(255);
 const crop=await sharp(Buffer.from(report.readings[0].crop.split(',')[1],'base64')).stats();expect(crop.channels[0].mean).toBeGreaterThan(crop.channels[1].mean);
 expect(report.academicScore).toBe(null);expect(report.starGranted).toBe(false);expect(report.readings[0].confidence.calibrated).toBe(false);
});
test('missing engine preserves crop and explains failure without a grade',async()=>{
 const bytes=await sharp({create:{width:40,height:40,channels:3,background:'white'}}).jpeg().toBuffer();
 const r=await processVisualPhoto('data:image/jpeg;base64,'+bytes.toString('base64'),{readerFactory:async()=>{throw Error('missing')}});
 expect(r.readings[0].crop).toMatch(/^data:image/);expect(r.readings[0].text).toBe('');expect(r.readings[0].reason).toBe('LOCAL_OCR_UNAVAILABLE');expect(r.academicScore).toBe(null);
});
test('slow reader times out but preserves the evidence and closes a late worker',async()=>{
 const bytes=await sharp({create:{width:40,height:40,channels:3,background:'white'}}).jpeg().toBuffer();let closed=false;
 const r=await processVisualPhoto('data:image/jpeg;base64,'+bytes.toString('base64'),{budgetMs:20,readerFactory:async()=>{await new Promise(resolve=>setTimeout(resolve,80));return {read:async()=>({text:'invented',confidence:100}),close:async()=>{closed=true}}}});
 expect(r.readings[0].reason).toBe('OCR_TIMEOUT');expect(r.readings[0].text).toBe('');expect(r.readings[0].crop).toMatch(/^data:image/);expect(r.starGranted).toBe(false);
 await new Promise(resolve=>setTimeout(resolve,90));expect(closed).toBe(true);
});
