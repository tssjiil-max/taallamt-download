import type { CommunicationEvent } from '../core/communication';
import { buildFormalMessage } from '../core/communication';
import { whatsappAction } from '../core/communication-url';
export interface CommunicationWriter{saveCommunication(event:CommunicationEvent):Promise<void>}
export async function prepareGuardianWhatsapp(input:{id:string;studentId:string;studentName:string;phone:string;reasonCode:string;reasonLabel:string;summary:string;now:string},writer:CommunicationWriter){const event:CommunicationEvent={id:input.id,studentId:input.studentId,recipient:'guardian',reasonCode:input.reasonCode,summary:input.summary,createdAt:input.now,status:'opened_in_whatsapp'};await writer.saveCommunication(event);return {event,url:whatsappAction(input.phone,buildFormalMessage(input.studentName,input.reasonLabel,input.summary))}}
