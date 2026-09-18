const base=String(process.env.TAALLAMT_PREVIEW_URL||'').replace(/\/$/,'');
if(!base)throw new Error('TAALLAMT_PREVIEW_URL_REQUIRED');

async function get(path){
  const response=await fetch(base+path,{redirect:'follow'});
  const text=await response.text();
  if(!response.ok)throw new Error(`${path} -> HTTP ${response.status}: ${text.slice(0,180)}`);
  return {response,text};
}

const home=await get('/');
if(!home.text.includes('id="root"'))throw new Error('HOME_ROOT_MISSING');

const lesson=await get('/teacher/lesson');
if(!lesson.text.includes('id="root"'))throw new Error('LESSON_ROUTE_ROOT_MISSING');

const preview=await get('/api/learning-automation?action=preview');
const previewJson=JSON.parse(preview.text);
if(!previewJson?.ok||!previewJson?.content)throw new Error('LEARNING_PREVIEW_INVALID');

const assistantResponse=await fetch(base+'/api/lesson-assistant',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    mode:'teacher',
    question:'أعطني سؤالًا شفهيًا قصيرًا مناسبًا لهذا الهدف.',
    context:{
      subject:'islamic',
      subjectLabel:'الدراسات الإسلامية',
      unit:'أسماء الله وصفاته',
      lesson:'الله السميع البصير',
      skill:'تمييز أثر الإيمان بالاسمين',
      gradeLabel:'الثاني',
      classLabel:'4'
    }
  })
});
const assistantText=await assistantResponse.text();
let assistant={};try{assistant=JSON.parse(assistantText)}catch{}
let assistantMode='remote';
if(assistantResponse.ok&&typeof assistant.answer==='string'&&assistant.answer.trim()){
  console.log('Remote Shakabambo sample:',assistant.answer.slice(0,180));
}else if(assistantResponse.status===503&&assistant?.error==='ASSISTANT_UNAVAILABLE'){
  assistantMode='local-fallback';
  console.warn('Remote Shakabambo unavailable in this Preview; validated graceful local-fallback contract.');
}else{
  throw new Error(`ASSISTANT_SMOKE_FAILED HTTP ${assistantResponse.status}: ${assistantText.slice(0,300)}`);
}

console.log(`Preview smoke passed: home, lesson route, learning preview, Shakabambo mode=${assistantMode}.`);
