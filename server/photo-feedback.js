// Encouragement uses verified training evidence, never raw OCR confidence or a client label.
export function photoFeedback({firstName,estimate=null,quality=null,previousScore=null,questions=[],status='',reviewNote=''}={}){
 const name=String(firstName||'صديقنا').trim().split(/\s+/)[0].slice(0,40)||'صديقنا';
 const base={scope:'training_estimate',level:'pending',text:'',nextStep:'',progress:'not_compared'};
 if(status==='needs_revision')return {...base,level:'practice',text:`يا ${name}، نراجع هذه الإجابة خطوة خطوة، ثم جرّب مرة ثانية. أنا معك.`,nextStep:String(reviewNote||'').trim().slice(0,600)};
 if(quality?.status==='needs_clearer_photo')return {...base,level:'clearer_photo',text:`يا ${name}، شكرًا لإرسال إجابتك. صوّر ورقة واحدة من قريب وبإضاءة أوضح حتى نقرأها جيدًا.`};
 if(!estimate||estimate.estimatedScore===null||!Number.isFinite(estimate.estimatedScore))return {...base,level:estimate?.items?.some(r=>r.status==='no_approved_key')?'awaiting_key':'teacher_review',text:`يا ${name}، وصلت إجابتك. نحتاج مراجعتها قبل تحديد مستواك، ونكمل التدريب معًا.`};
 const score=estimate.estimatedScore;
 const level=score>=90?'excellent':score>=70?'good':'practice';
 const text=level==='excellent'?`ممتاز يا ${name}! أداؤك في هذه الإجابة مميز. واصل تدريبك.`:level==='good'?`جيد يا ${name}! أنجزت جزءًا كبيرًا من الإجابة، ونراجع الباقي معًا.`:`يا ${name}، نتمرّن خطوة خطوة على هذه المهارة، ثم تحاول مرة ثانية. أنا معك.`;
 const missed=estimate.items?.find(r=>['incorrect','partial'].includes(r.status)),question=missed&&questions.find(q=>q.id===missed.questionId);
 const nextStep=question?.hint?String(question.hint).trim().slice(0,500):missed?'راجع الإجابة التي تحتاج تعديلًا مع المعلم، ثم جرّب مرة أخرى.':'';
 const improved=Number.isFinite(previousScore)&&score>previousScore;
 return {...base,level,text:improved?`${text} تقدّمت عن محاولتك السابقة في هذه المهارة، أحسنت!`:text,nextStep,progress:improved?'improved':Number.isFinite(previousScore)?'compared':'not_compared'};
}
