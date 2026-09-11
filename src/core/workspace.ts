export interface TeacherWorkspace {
  id: string;
  teacherName: string;
  schoolName: string;
  classLabel: string;
  academicTerm: string;
  active: boolean;
}

export interface WorkspaceAccess {
  workspaceId: string;
  role: 'teacher' | 'student';
  studentId?: string;
}

// إنشاء نسخة لمعلم/فصل آخر يعني Workspace جديد بنفس النواة، لا نسخ الكود أو خلط البيانات.
