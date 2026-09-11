import type { Student } from './domain';
export type StudentRemovalDecision='delete_empty_record'|'archive_with_history';
export function removalDecision(hasLearningHistory:boolean):StudentRemovalDecision{return hasLearningHistory?'archive_with_history':'delete_empty_record'}
export function archiveStudentRecord(student:Student,now:string):Student{return {...student,active:false,archivedAt:now}}
