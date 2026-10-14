import {gradeAnswer} from './learning-core.js';

export function evaluateVerifiedPhotoAnswers(questions,answers){
  if(!Array.isArray(questions)||!Array.isArray(answers)||!questions.length||questions.length!==answers.length||questions.length>20)throw new Error('ANSWER_COUNT_INVALID');
  if(answers.some(value=>typeof value!=='string'||value.length>300))throw new Error('ANSWER_FORMAT_INVALID');
  const results=questions.map((question,index)=>gradeAnswer(question,answers[index]));
  const correct=results.filter(Boolean).length;
  const estimatedScore=Math.round(correct*100/results.length);
  return {results,correct,total:results.length,estimatedScore,eligibleForStar:estimatedScore===100&&results.length>=3};
}
