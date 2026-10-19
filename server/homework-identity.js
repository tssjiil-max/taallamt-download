import {createHash} from 'node:crypto';
export function homeworkIdentity(item){
 const fields=['termId','weekNumber','subjectKey','learningPath','taskType','lesson','segment','skill','page','task','instructions'];
 return createHash('sha256').update(JSON.stringify(fields.map(k=>String(item[k]??'').normalize('NFC').replace(/\s+/g,' ').trim()))).digest('hex').slice(0,24);
}
export function pilotHomeworkId(item,env=process.env){
 return env.VERCEL_ENV!=='production'&&env.VERCEL_GIT_COMMIT_REF==='preview/shakabumbo-pilot-20261013'?`auto-homework:weekly:${homeworkIdentity(item)}`:item.id;
}
