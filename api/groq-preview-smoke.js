import {requireTeacher, AccessError, sameOrigin} from '../server/access.js';

// Manual, teacher-only Groq connectivity diagnostic. No student data and no browser-visible API key.
// Preview-only. No application UI changes or production exposure.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ok:false,code:'PREVIEW_ONLY'});
  if (req.method !== 'POST') return res.status(405).json({ok:false,code:'POST_REQUIRED'});
  try {
    requireTeacher(req,{write:true});
  } catch (error) {
    return res.status(error instanceof AccessError ? error.status : 401).json({ok:false,code:'TEACHER_AUTH_REQUIRED'});
  }
  if (!sameOrigin(req)) return res.status(403).json({ok:false,code:'ORIGIN_INVALID'});
  const key=process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ok:false,code:'GROQ_API_KEY_MISSING'});
  const mode=req.body?.mode;
  if (mode !== 'chat' && mode !== 'saudi-voice') return res.status(400).json({ok:false,code:'INVALID_MODE'});
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try {
    const url=mode==='chat'?'https://api.groq.com/openai/v1/chat/completions':'https://api.groq.com/openai/v1/audio/speech';
    const payload=mode==='chat'
      ? {model:'openai/gpt-oss-20b',temperature:0.2,max_completion_tokens:140,messages:[
          {role:'system',content:'أجب بالعربية الفصحى المبسطة المناسبة لطفل في الصف الثاني. لا تخترع معلومات عن المنهج.'},
          {role:'user',content:'اشرح معنى التعاون في جملة قصيرة.'}
        ]}
      : {model:'canopylabs/orpheus-arabic-saudi',voice:'sultan',input:'أهلًا يا بطل! هيا نتعلم معًا.',response_format:'wav'};
    const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    if(!response.ok){
      // Do not relay upstream error body: it may contain sensitive account metadata.
      return res.status(502).json({ok:false,mode,code:'GROQ_UPSTREAM_ERROR',upstreamStatus:response.status});
    }
    if(mode==='chat'){
      const json=await response.json();
      const answer=String(json?.choices?.[0]?.message?.content||'').slice(0,700);
      return res.status(200).json({ok:Boolean(answer),mode,answer});
    }
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.length>2_000_000)return res.status(502).json({ok:false,mode,code:'AUDIO_TOO_LARGE'});
    res.setHeader('Content-Type','audio/wav');
    res.setHeader('Content-Length',String(bytes.length));
    return res.status(200).end(bytes);
  }catch(error){
    return res.status(502).json({ok:false,mode,code:error?.name==='AbortError'?'GROQ_TIMEOUT':'GROQ_REQUEST_FAILED'});
  }finally{clearTimeout(timeout);}
}
