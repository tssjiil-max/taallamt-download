export type CommunicationRecipient = 'guardian' | 'counselor' | 'vice_principal';

export interface CommunicationEvent {
  id: string;
  studentId: string;
  recipient: CommunicationRecipient;
  reasonCode: string;
  summary: string;
  createdAt: string;
  status: 'prepared' | 'opened_in_whatsapp' | 'recorded';
}

export interface SchoolContacts {
  counselorWhatsapp?: string;
  vicePrincipalWhatsapp?: string;
}

export function buildFormalMessage(studentName: string, reason: string, summary: string) {
  return `السلام عليكم، بخصوص الطالب ${studentName}. سبب التواصل: ${reason}. ${summary}`;
}

// التواصل من جهة المعلم فقط وبسبب موثق؛ لا توجد محادثة حرة في صفحة الطالب.
