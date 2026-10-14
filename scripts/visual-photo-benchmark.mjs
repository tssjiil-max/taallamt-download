// Generated text fixtures only. These are NOT samples of children's handwriting.
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {processVisualPhoto} from '../server/visual-photo.js';
const destination=process.argv[2];if(!destination)throw Error('Pass an output directory outside the repository');
await mkdir(destination,{recursive:true});
const cases=[{id:'black-word',expected:'كتاب'},{id:'tanwin',expected:'صديقٍ'},{id:'pencil-simulation',expected:'قلم',color:'#777777'},{id:'low-light',expected:'بيت',dark:true},{id:'tilted',expected:'مدرسة',angle:8},{id:'red-correction',expected:'قمر',red:true}];
const rows=[];
for(const c of cases){
 const text=await sharp({text:{text:`<span foreground="${c.color||'#000000'}">${c.expected}</span>`,fontfile:'public/learning-font/NotoNaskhArabic-Regular.ttf',font:'Noto Naskh Arabic 80',rgba:true}}).flatten({background:'white'}).png().toBuffer();
 let b=await sharp(text).extend({top:8,bottom:8,left:8,right:8,background:'white'}).png().toBuffer();
 if(c.red){const meta=await sharp(b).metadata();const svg=`<svg width="${meta.width}" height="${meta.height}"><path d="M 20 20 L 45 45 L 80 10" fill="none" stroke="red" stroke-width="4"/></svg>`;b=await sharp(b).composite([{input:Buffer.from(svg)}]).png().toBuffer();}
 if(c.dark)b=await sharp(b).modulate({brightness:.4}).png().toBuffer();if(c.angle)b=await sharp(b).rotate(c.angle,{background:'white'}).png().toBuffer();
 b=await sharp(b).jpeg({quality:90}).toBuffer();
 const report=await processVisualPhoto('data:image/jpeg;base64,'+b.toString('base64'));
 const actual=report.readings[0].text;
 rows.push({id:c.id,expected:c.expected,actual,exact:actual===c.expected,confidence:report.readings[0].confidence,redPixels:report.redPixels,score:report.academicScore,star:report.starGranted,reason:report.readings[0].reason});
 await writeFile(`${destination}/${c.id}.jpg`,b);
}
const summary={fixtureType:'generated-print-not-handwriting',license:'Generated fixture composition CC0; font Noto Naskh Arabic SIL OFL',count:rows.length,exact:rows.filter(r=>r.exact).length,rows};
await writeFile(`${destination}/comparison.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
