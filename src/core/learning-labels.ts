import type { CurriculumTarget } from './domain';
export function targetLabel(targetId:string,targets:CurriculumTarget[]){return targets.find(t=>t.id===targetId)?.title??targetId}
export function masteryLabel(result:'mastered'|'needs_practice'|'not_mastered'){return result==='mastered'?'أتقن':result==='needs_practice'?'يحتاج تدريب':'لم يتقن'}
