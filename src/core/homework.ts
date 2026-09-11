export interface Homework {
  id: string;
  classId: string;
  subject: string;
  title: string;
  instructions?: string;
  targetIds: string[];
  assignedAt: string;
  dueAt?: string;
  status: 'draft' | 'published' | 'closed';
}

export interface HomeworkEvidence {
  id: string;
  homeworkId: string;
  studentId: string;
  status: 'assigned' | 'completed' | 'reviewed';
  evidenceFileId?: string;
  completedAt?: string;
}
