import {rosterStudent} from './roster.js';
import {readTutorLesson} from './learning-pilot.js';
const jsonBody=req=>(typeof req.body==='string'?JSON.parse(req.body||'{}'):req.body)||{};
export default async function shakabumboSpeech(req,res){
      if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'PREVIEW_ONLY'});
      const body=jsonBody(req);
      let text=String(body.text||'').trim();
      const voice=body.voice||'fahad';
      if(!['fahad','lulwa','noura','aisha'].includes(voice))return res.status(400).json({error:'VOICE_INVALID'});
      if(!text||text.length>200)return res.status(400).json({error:'TEXT_INVALID'});
      // Reuse the same lesson authorization as the tutor model; Quran is explicitly blocked.
      const lesson=await readTutorLesson(req,body);
      if(!['arabic','spelling','handwriting'].includes(lesson.subject))return res.status(403).json({error:'SUBJECT_BLOCKED'});
      if(body.greeting===true){const name=rosterStudent(body.studentId)?.firstName||'يا بطل';text=`السلام عليكم ${name}! أنا شكابمبو، صديقك في تعلّمت. اسألني وسأساعدك خطوة خطوة.`;}
      if(!process.env.GROQ_API_KEY)return res.status(503).json({error:'GROQ_NOT_CONFIGURED'});
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      try{
        const upstream=await fetch('https://api.groq.com/openai/v1/audio/speech',{
          method:'POST',signal:controller.signal,
          headers:{authorization:`Bearer ${process.env.GROQ_API_KEY}`,'content-type':'application/json'},
          body:JSON.stringify({model:'canopylabs/orpheus-arabic-saudi',voice,input:text,response_format:'wav'})
        });
        if(!upstream.ok){
          const detail=await upstream.json().catch(()=>({}));
          const code=String(detail.error?.code||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
          return res.status(upstream.status===429?429:502).json({error:'GROQ_SPEECH_UNAVAILABLE',upstreamStatus:upstream.status,providerCode:code});
        }
        for(const header of ['x-ratelimit-limit-requests','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens']){const value=upstream.headers?.get(header);if(value&&/^\d+$/.test(value))res.setHeader(header,value)}
        const buffer=Buffer.from(await upstream.arrayBuffer());
        if(buffer.length<44||buffer.toString('ascii',0,4)!=='RIFF'||buffer.toString('ascii',8,12)!=='WAVE')return res.status(502).json({error:'AUDIO_FORMAT_INVALID'});
        if(buffer.length>2_000_000)return res.status(502).json({error:'AUDIO_TOO_LARGE'});
        res.setHeader('Content-Type','audio/wav');res.setHeader('Cache-Control','private, no-store');return res.status(200).end(buffer);
      }catch(e){return res.status(502).json({error:e?.name==='AbortError'?'GROQ_TIMEOUT':'GROQ_SPEECH_FAILED'});}finally{clearTimeout(timer)}
}
