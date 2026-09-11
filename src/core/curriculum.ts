import { CurriculumTarget } from './domain';

export interface CurriculumSource {
 id:string;
 title:string;
 subject:CurriculumTarget['subject'];
 academicTerm:string;
 sourceType:'official_book'|'teacher_guide'|'distribution'|'unit_guide'|'teacher_material';
 fileId?:string;
 approved:boolean;
}

export interface CurriculumContent {
 id:string;
 sourceId:string;
 targetId:string;
 text:string;
 page?:number;
}

export function approvedContentOnly(sources:CurriculumSource[],content:CurriculumContent[]){
 const approved=new Set(sources.filter(s=>s.approved).map(s=>s.id));
 return content.filter(c=>approved.has(c.sourceId));
}
