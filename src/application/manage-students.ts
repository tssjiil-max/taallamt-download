import { Student } from '../core/domain';
import { LearningRepository,StudentRepository } from '../core/ports';
import { removalDecision } from '../core/student-management';
export async function addStudent(repo:StudentRepository,input:Omit<Student,'active'|'createdAt'>){const student:Student={...input,active:true,createdAt:new Date().toISOString()};await repo.save(student);return student}
export async function updateStudent(repo:StudentRepository,student:Student,patch:Partial<Pick<Student,'fullName'|'guardian'>>){const updated={...student,...patch};await repo.save(updated);return updated}
export async function archiveStudent(repo:StudentRepository,student:Student){await repo.save({...student,active:false,archivedAt:new Date().toISOString()})}
export async function removeStudent(repo:StudentRepository,learning:LearningRepository,student:Student){const [assessments,remediation,portfolio,evidence]=await Promise.all([learning.listStudentAssessments(student.id),learning.listStudentRemediation(student.id),learning.listStudentPortfolio(student.id),learning.listStudentHomeworkEvidence(student.id)]);const decision=removalDecision(Boolean(assessments.length||remediation.length||portfolio.length||evidence.length));if(decision==='delete_empty_record')await repo.delete(student.id);else await archiveStudent(repo,student);return decision}
