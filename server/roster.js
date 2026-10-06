// One class roster for the new teacher/student pages. Source: the latest list supplied for the class (30 students),
// the same list the daily homework and the Quran follow-up already use.
import {CLASS_ID} from './class-roster.js';
import {QURAN_FOLLOWUP_ROSTER} from './quran-followup-curriculum.js';

export const SCHOOL_ID='amr-bin-aws-althaqafi';
export const SCHOOL_NAME='مدرسة عمرو بن أوس الثقفي';
export const TEACHER_NAME='أ. سلطان الصاعدي';
export const TEACHER_FIRST_NAME='سلطان';
export const CLASS_LABEL='الصف الثاني الابتدائي';
export const CLASS_SHORT='الثاني / 4';
export const TERM_ID='1448-f1';
export const TERM_LABEL='الفصل الدراسي الأول 1448هـ';

export const ROSTER=QURAN_FOLLOWUP_ROSTER.map((student,index)=>({id:student.id,number:index+1,name:student.name,firstName:String(student.name).split(' ')[0],classId:CLASS_ID}));
const BY_ID=new Map(ROSTER.map(student=>[student.id,student]));
export const rosterStudent=id=>BY_ID.get(String(id||''))||null;
export const ROSTER_IDS=ROSTER.map(student=>student.id);
