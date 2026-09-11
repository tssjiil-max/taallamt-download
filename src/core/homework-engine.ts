import type { Homework } from './homework';

export function createPracticeHomework(input:{id:string;classId:string;subject:string;targetId:string;assignedAt:string;dueAt?:string;title?:string}):Homework{
 return {id:input.id,classId:input.classId,subject:input.subject,title:input.title??'تدريب قصير',instructions:'تدريب داعم للمهارة الحالية',targetIds:[input.targetId],assignedAt:input.assignedAt,dueAt:input.dueAt,status:'published'};
}

export function homeworkVisibleToStudent(homework:Homework[],now:string){return homework.filter(h=>h.status==='published'&&(!h.dueAt||h.dueAt>=now))}
