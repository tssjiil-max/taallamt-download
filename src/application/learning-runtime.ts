import type { ComprehensiveAssessment, CurriculumTarget, Student } from '../core/domain';
import type { CurriculumRepository, LearningRepository, StudentRepository } from '../core/ports';
import type { RewardRepository } from './save-comprehensive-assessment';
import { saveAssessmentBatch } from './save-assessment-batch';
import { loadStudentLiveView, type StudentLiveReader } from './student-live-view';

export interface LearningRuntimeDeps {
 students: StudentRepository;
 curriculum: CurriculumRepository;
 learning: LearningRepository;
 rewards: RewardRepository;
 studentLive: StudentLiveReader;
}

export class LearningRuntime {
 constructor(private deps:LearningRuntimeDeps){}
 listStudents():Promise<Student[]>{return this.deps.students.listActive()}
 listTargets():Promise<CurriculumTarget[]>{return this.deps.curriculum.listTargets()}
 async saveAssessments(items:(ComprehensiveAssessment|null)[]){return saveAssessmentBatch(items,{learning:this.deps.learning,rewards:this.deps.rewards})}
 studentView(studentId:string,month:string){return loadStudentLiveView(studentId,month,this.deps.studentLive)}
}
