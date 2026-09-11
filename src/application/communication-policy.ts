import type { CommunicationRecipient } from '../core/communication';

export interface ConcernSignal {kind:'behavior'|'academic';repeatCount:number;serious?:boolean}
export function recommendedRecipients(signal:ConcernSignal):CommunicationRecipient[]{
 if(signal.serious)return ['guardian','counselor','vice_principal'];
 if(signal.repeatCount>=3)return ['guardian','counselor'];
 if(signal.repeatCount>=2)return ['guardian'];
 return [];
}
// هذه توصية للمعلم وليست إرسالًا آليًا. المعلم يقرر فتح رسالة واتساب المجهزة.
