export function normalizeSaudiWhatsapp(phone:string){const digits=phone.replace(/\D/g,'');if(digits.startsWith('966'))return digits;if(digits.startsWith('0'))return `966${digits.slice(1)}`;return digits}
export function whatsappAction(phone:string,message:string){const recipient=normalizeSaudiWhatsapp(phone);return `https://wa.me/${recipient}?text=${encodeURIComponent(message)}`}
// الرابط يُنشأ فقط عند ضغط المعلم على إجراء تواصل موثق؛ لا يوجد إرسال تلقائي.
