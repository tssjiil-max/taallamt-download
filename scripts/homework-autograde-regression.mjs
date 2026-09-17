import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createAutoGradingConfig,gradeHomeworkAnswer,normalizeHomeworkAnswer,publicAutoGradingConfig} from '../server/homework-autograde.mjs';

assert.equal(normalizeHomeworkAnswer('  السَّلَامُ، عليكم!  '),'السلام عليكم');

const secret='test-secret-only';
const config=createAutoGradingConfig({answerKey:'السلام عليكم',acceptedAnswers:['وعليكم السلام'],maxScore:10},secret);
assert.equal(config.enabled,true);
assert.equal(config.maxScore,10);
assert.equal(Array.isArray(config.answerDigests),true);
assert.equal(config.answerDigests.length,2);
assert.equal('answerKey' in config,false);
assert.equal(JSON.stringify(config).includes('السلام عليكم'),false);
const publicConfig=publicAutoGradingConfig(config);
assert.deepEqual(publicConfig,{enabled:true,mode:'auto_exact',maxScore:10});
assert.equal('answerDigests' in publicConfig,false);

const exact=gradeHomeworkAnswer({answer:'السَّلَام عليكم',config,secret});
assert.deepEqual(exact,{status:'graded',score:10,maxScore:10,correct:true,requiresTeacherReview:false,feedback:'إجابة صحيحة ✓',mode:'auto_exact'});
const alternative=gradeHomeworkAnswer({answer:'وعليكم السَلام',config,secret});
assert.equal(alternative.correct,true);
const wrong=gradeHomeworkAnswer({answer:'إجابة أخرى',config,secret});
assert.equal(wrong.score,0);
const review=gradeHomeworkAnswer({answer:'كتبت فقرة طويلة عن الدرس',config:null,secret});
assert.equal(review.requiresTeacherReview,true);

const required=[
  'api/homework-complete.js',
  'public/teacher-action-forms.js',
  'public/student-homework-autograde.js',
  'public/teacher-homework-status.js',
  'index.html'
];
for(const path of required)assert.equal(existsSync(path),true,`missing ${path}`);
const completeApi=readFileSync('api/homework-complete.js','utf8');
const teacherForm=readFileSync('public/teacher-action-forms.js','utf8');
const studentUi=readFileSync('public/student-homework-autograde.js','utf8');
const teacherStatus=readFileSync('public/teacher-homework-status.js','utf8');
const index=readFileSync('index.html','utf8');
const studentState=readFileSync('api/student-state.js','utf8');
assert.equal(existsSync('api/homework-create.js'),false,'auto grading must reuse student-state to stay within the Vercel function budget');
assert.equal(studentState.includes('createAutoGradingConfig'),true);
assert.equal(studentState.includes('autoGrading'),true);
assert.equal(completeApi.includes('gradeHomeworkAnswer'),true);
assert.equal(completeApi.includes("status:grade.status"),true);
assert.equal(teacherForm.includes('answerKey'),true);
assert.equal(teacherForm.includes('/api/student-state'),true);
assert.equal(teacherForm.includes('/api/homework-create'),false);
assert.equal(studentUi.includes('/api/homework-complete'),true);
assert.equal(studentUi.includes('درجتك'),true);
assert.equal(teacherStatus.includes('score'),true);
assert.equal(index.includes('/student-homework-autograde.js'),true);
assert.equal(studentState.includes('publicAutoGradingConfig'),true);

console.log('Homework auto-grade regression checks passed.');
