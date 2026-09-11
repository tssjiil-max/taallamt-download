import { LearningRuntime } from '../../application/learning-runtime';
import { FirestoreCurriculumRepository, FirestoreLearningRepository, FirestoreStudentRepository } from './firestore-repositories';
import { FirestoreRewardRepository } from './reward-repository';
import { FirestoreStudentLiveReader } from './student-live-reader';

export function firebaseLearningRuntime(workspaceId:string){
 const learning=new FirestoreLearningRepository(workspaceId);
 return new LearningRuntime({
  students:new FirestoreStudentRepository(workspaceId),
  curriculum:new FirestoreCurriculumRepository(workspaceId),
  learning,
  rewards:new FirestoreRewardRepository(workspaceId),
  studentLive:new FirestoreStudentLiveReader(workspaceId),
 });
}
