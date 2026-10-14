// Scheduling policy is isolated to the pilot preview; existing production timetables are untouched.
export function isPilotSchedule(environment=process.env){
  return environment.VERCEL_ENV!=='production'&&environment.VERCEL_GIT_COMMIT_REF==='preview/shakabumbo-pilot-20261013';
}
export function pilotDaySubjects(subjects,weekday,environment=process.env){
  if(!isPilotSchedule(environment))return [...subjects];
  const result=subjects.filter(subject=>subject!=='spelling');
  if(Number(weekday)===3)result.push('spelling');
  return result;
}
export function pilotSpellingDays(days,environment=process.env){
  return isPilotSchedule(environment)?[{weekday:3,day:'الأربعاء',text:'درس الإملاء'}]:days;
}
