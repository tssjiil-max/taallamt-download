import { Student } from '../core/domain';
import { StudentRepository } from '../core/ports';

export async function addStudent(repo: StudentRepository, input: Omit<Student, 'active' | 'createdAt'>) {
  const student: Student = { ...input, active: true, createdAt: new Date().toISOString() };
  await repo.save(student);
  return student;
}

export async function updateStudent(repo: StudentRepository, student: Student, patch: Partial<Pick<Student, 'fullName' | 'guardian'>>) {
  const updated = { ...student, ...patch };
  await repo.save(updated);
  return updated;
}

export async function archiveStudent(repo: StudentRepository, student: Student) {
  // لا نحذف تاريخ الطالب الأكاديمي؛ نوقف ظهوره من القائمة النشطة فقط.
  await repo.save({ ...student, active: false, archivedAt: new Date().toISOString() });
}
