import {createHmac} from 'node:crypto';

const ARABIC_DIGITS={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};

export function normalizeHomeworkAnswer(value){
  return String(value??'')
    .trim()
    .toLowerCase()
    .replace(/[٠-٩۰-۹]/g,d=>ARABIC_DIGITS[d]||d)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'')
    .replace(/ـ/g,'')
    .replace(/[إأآٱ]/g,'ا')
    .replace(/ى/g,'ي')
    .replace(/[،؛؟!?.,:;"'()\[\]{}\-_/\\]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

const safeMaxScore=value=>{
  const n=Number(value);
  if(!Number.isFinite(n)||n<=0)return 10;
  return Math.min(100,Math.round(n*100)/100);
};

export function gradingSecretFromEnv(env=process.env){
  return String(env.TAALLAMT_GRADING_SECRET||env.FIREBASE_SERVICE_ACCOUNT_JSON||env.FIREBASE_PRIVATE_KEY||'taallamt-autograde-v1');
}

const digest=(value,secret)=>createHmac('sha256',String(secret||'taallamt-autograde')).update(normalizeHomeworkAnswer(value)).digest('hex');

export function createAutoGradingConfig({answerKey,acceptedAnswers=[],maxScore=10}={},secret=''){
  const answers=[answerKey,...(Array.isArray(acceptedAnswers)?acceptedAnswers:[])]
    .map(normalizeHomeworkAnswer)
    .filter(Boolean);
  if(!answers.length)return null;
  const answerDigests=[...new Set(answers.map(answer=>digest(answer,secret)))];
  return {enabled:true,mode:'auto_exact',maxScore:safeMaxScore(maxScore),answerDigests};
}

export function publicAutoGradingConfig(config){
  if(!config?.enabled)return null;
  return {enabled:true,mode:String(config.mode||'auto_exact'),maxScore:safeMaxScore(config.maxScore)};
}

export function gradeHomeworkAnswer({answer,config,secret=''}={}){
  const max=safeMaxScore(config?.maxScore);
  if(!config?.enabled||!Array.isArray(config.answerDigests)||!config.answerDigests.length){
    return {status:'submitted',score:null,maxScore:max,correct:null,requiresTeacherReview:true,feedback:'تم التسليم ويحتاج اعتماد المعلم',mode:'review'};
  }
  const correct=config.answerDigests.includes(digest(answer,secret));
  return {status:'graded',score:correct?max:0,maxScore:max,correct,requiresTeacherReview:false,feedback:correct?'إجابة صحيحة ✓':'تحتاج مراجعة الإجابة',mode:'auto_exact'};
}
