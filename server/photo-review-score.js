import {compareVisualAnswer} from './visual-photo.js';

// Only called after the teacher verifies transcription. OCR alone never enters this function.
export function evaluateVerifiedPhotoAnswers(questions,answers){
 if(!Array.isArray(questions)||!Array.isArray(answers)||!questions.length||questions.length!==answers.length||questions.length>20)throw new Error('ANSWER_COUNT_INVALID');
 if(answers.some(value=>value!==null&&(typeof value!=='string'||value.length>300)))throw new Error('ANSWER_FORMAT_INVALID');
 const weights=questions.map(q=>q.points===undefined?1:q.points);
 if(weights.some(p=>typeof p!=='number'||!Number.isFinite(p)||p<=0||p>100))throw new Error('RUBRIC_INVALID');
 const items=questions.map((q,i)=>{
   const keyed=Array.isArray(q.answers)&&q.answers.length>0;
   const resolved=keyed&&answers[i]!==null;
   const correct=resolved&&compareVisualAnswer(q,answers[i]);
   const partial=resolved&&!correct&&Array.isArray(q.partialAnswers)?q.partialAnswers.find(p=>typeof p.answer==='string'&&compareVisualAnswer({answers:[p.answer],ignoreDiacritics:q.ignoreDiacritics,diacritics:q.diacritics},answers[i])&&typeof p.points==='number'&&p.points>0&&p.points<weights[i]):null;
   return {questionId:q.id||String(i+1),status:!keyed?'no_approved_key':!resolved?'needs_review':correct?'correct':partial?'partial':'incorrect',points:correct?weights[i]:partial?.points||0,maxPoints:weights[i],resolved,reason:!keyed?'لا يوجد مفتاح إجابة':!resolved?'الإجابة غير واضحة':correct?'مطابقة لمفتاح المعلم':partial?'مطابقة لمعيار التصحيح الجزئي':'اختلاف عن الإجابات المقبولة'};
 });
 const totalPoints=weights.reduce((a,b)=>a+b,0),earned=items.reduce((a,r)=>a+r.points,0),unknown=items.filter(r=>!r.resolved).reduce((a,r)=>a+r.maxPoints,0);
 const correct=items.filter(r=>r.status==='correct').length;
 const estimatedScore=unknown?null:Math.round(earned*100/totalPoints);
 return {results:items.map(r=>r.resolved?r.status==='correct':null),items,correct,total:items.length,totalPoints,earnedPoints:earned,estimatedScore,scoreRange:{min:Math.round(earned*100/totalPoints),max:Math.round((earned+unknown)*100/totalPoints)},weightSource:questions.every(q=>q.points!==undefined)?'teacher_rubric':'equal_weight_training_only',eligibleForStar:false};
}
