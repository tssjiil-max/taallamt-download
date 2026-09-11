export type FilePurpose='curriculum'|'teacher_guide'|'distribution'|'student_evidence'|'teacher_evidence'|'portfolio';
export interface FileAsset {id:string;workspaceId:string;name:string;mimeType:string;purpose:FilePurpose;storagePath:string;createdAt:string;studentId?:string;subject?:string;approvedForAI:boolean}
export function aiReadableFiles(files:FileAsset[]){return files.filter(f=>f.approvedForAI&&['curriculum','teacher_guide','distribution'].includes(f.purpose))}
