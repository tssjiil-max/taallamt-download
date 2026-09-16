export function countNeedsFollowup(assessments=[]){
  return assessments.reduce((total,assessment)=>total+(assessment?.behavior||[]).filter(item=>item?.code==='needs_followup').length,0);
}

export function effectiveAssessmentGroup(profile={},assessments=[],needsFollowupCount=null){
  if(profile?.assessmentGroup==='focused')return 'focused';
  const count=Number.isFinite(Number(needsFollowupCount))?Number(needsFollowupCount):countNeedsFollowup(assessments);
  return count>=4?'focused':'followup';
}
