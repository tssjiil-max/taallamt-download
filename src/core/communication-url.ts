export function normalizeSaudiWhatsapp(phone:string){const digits=phone.replace(/\D/g,'');const normalized=digits.startsWith('966')?digits:digits.startsWith('0')?`966${digits.slice(1)}`:digits.startsWith('5')?`966${digits}`:digits;if(!/^9665\d{8}$/.test(normalized))throw new Error('INVALID_SAUDI_MOBILE');return normalized}
export function whatsappAction(phone:string,message:string){const recipient=normalizeSaudiWhatsapp(phone);return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`}
// الرابط يُنشأ فقط عند ضغط المعلم على إجراء تواصل موثق؛ لا يوجد إرسال تلقائي.
