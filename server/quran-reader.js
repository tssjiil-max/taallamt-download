import {createHash} from 'node:crypto';
import data from './quran-text.json' with {type:'json'};
const names={'البروج':85,'الطارق':86,'الأعلى':87,'الغاشية':88,'الفجر':89,'البلد':90,'الشمس':91,'الليل':92};
const digits=value=>String(value||'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
export function publishedQuran(plan){
  const item=plan?.items?.find(i=>i.subjectKey==='quran');
  if(!item?.published||item.holiday||plan.holiday)return [];
  const base=Object.keys(names).filter(name=>String(item.unit||'').includes(name));
  const days=item.days?.length?item.days:[{weekday:null,day:'مقرر الأسبوع',text:item.lesson||''}];
  const segments=[];
  for(const day of days){
    const text=digits(day.text),range=text.match(/(\d+)\s*[-–—]\s*(\d+)/);
    if(!range)continue; // Assessment/review without an explicit approved verse range adds no verses.
    const explicit=Object.keys(names).filter(name=>text.includes(name));
    const selected=explicit.length===1?explicit:base.length===1?base:[];
    if(selected.length!==1)continue;
    const name=selected[0],surah=names[name],start=Number(range[1]),end=Number(range[2]),source=data.surahs[String(surah)];
    if(start<1||end<start||end>source.length)continue;
    const verses=source.filter(v=>v.number>=start&&v.number<=end);
    const revision=createHash('sha256').update(JSON.stringify({week:plan.week,surah,start,end,text:verses})).digest('hex').slice(0,16);
    segments.push({id:`quran-${revision}`,week:plan.week,surah,name,start,end,day:day.day,verses});
  }
  return segments;
}
export const QURAN_SOURCE={name:data.source,url:data.url,license:'CC BY 3.0 — النص ينقل كما هو دون تعديل',notice:data.copyright+'. CC BY 3.0. Permission to copy verbatim; changing the Quran text is not allowed.'};
