import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firebaseDb } from './client';
import { paths } from '../firestore/schema';
import type { ComprehensiveAssessment, CurriculumTarget, PortfolioEvent, RemediationPlan, Student } from '../../core/domain';
import type { CurriculumRepository, LearningRepository, StudentRepository } from '../../core/ports';
import type { ClassSession, TimetableEntry, WeeklyPlanItem } from '../../core/session';

export class FirestoreStudentRepository implements StudentRepository {
 constructor(private workspaceId:string){}
 async listActive(){const s=await getDocs(query(collection(firebaseDb(),paths.students(this.workspaceId)),where('active','==',true)));return s.docs.map(d=>d.data() as Student)}
 async get(id:string){const s=await getDoc(doc(firebaseDb(),paths.students(this.workspaceId),id));return s.exists()?s.data() as Student:null}
 async save(student:Student){await setDoc(doc(firebaseDb(),paths.students(this.workspaceId),student.id),student,{merge:true})}
 async archive(id:string){await setDoc(doc(firebaseDb(),paths.students(this.workspaceId),id),{active:false,archivedAt:new Date().toISOString()},{merge:true})}
}

export class FirestoreCurriculumRepository implements CurriculumRepository {
 constructor(private workspaceId:string){}
 async listTargets(subject?:CurriculumTarget['subject']){const ref=collection(firebaseDb(),paths.curriculum(this.workspaceId));const s=await getDocs(subject?query(ref,where('subject','==',subject)):ref);return s.docs.map(d=>d.data() as CurriculumTarget)}
 async saveTargets(targets:CurriculumTarget[]){await Promise.all(targets.map(t=>setDoc(doc(firebaseDb(),paths.curriculum(this.workspaceId),t.id),t,{merge:true})))}
}

export class FirestoreLearningRepository implements LearningRepository {
 constructor(private workspaceId:string){}
 async getSession(id:string){const s=await getDoc(doc(firebaseDb(),paths.sessions(this.workspaceId),id));return s.exists()?s.data() as ClassSession:null}
 async saveSession(v:ClassSession){await setDoc(doc(firebaseDb(),paths.sessions(this.workspaceId),v.id),v,{merge:true})}
 async saveAssessment(v:ComprehensiveAssessment){await setDoc(doc(firebaseDb(),paths.assessments(this.workspaceId),v.id),v,{merge:false})}
 async listStudentAssessments(studentId:string){const s=await getDocs(query(collection(firebaseDb(),paths.assessments(this.workspaceId)),where('studentId','==',studentId)));return s.docs.map(d=>d.data() as ComprehensiveAssessment)}
 async saveRemediation(v:RemediationPlan){await setDoc(doc(firebaseDb(),paths.remediation(this.workspaceId),v.id),v,{merge:true})}
 async appendPortfolio(events:PortfolioEvent[]){await Promise.all(events.map(v=>setDoc(doc(firebaseDb(),paths.portfolio(this.workspaceId),v.id),v,{merge:false})))}
 async listTimetable(classId:string){const s=await getDocs(query(collection(firebaseDb(),paths.timetable(this.workspaceId)),where('classId','==',classId)));return s.docs.map(d=>d.data() as TimetableEntry)}
 async listWeeklyPlan(weekKey:string){const s=await getDocs(query(collection(firebaseDb(),paths.weeklyPlan(this.workspaceId)),where('weekKey','==',weekKey)));return s.docs.map(d=>d.data() as WeeklyPlanItem)}
}
