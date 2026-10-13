// Verified against the supplied final book's index (physical page 2), ruling (physical page 3),
// and tanween lesson (physical page 17). Templates remain drafts until the teacher reviews and approves them.
export const TEACHER_BOOK_REFERENCE={
  title:'كتاب مهارات الإملاء والخط العربي — الصف الثاني الابتدائي — الفصل الأول 1448',
  filename:'كتاب_مهارات_الإملاء_والخط_العربي_نهائي_للطباعة_الصفحة_الأخيرة_تسطير_نهائي(3).pdf',
  sha256:'c66b647a4f5177e2e9bc7af9fb2057f5efc21f0f15d49d6d7aa43de2a95157c9',
  pages:39,author:'سلطان الصاعدي',status:'reference_verified_templates_pending_teacher_review',
  skills:['مراجعة الحركات القصيرة والسكون','اللام القمرية','اللام الشمسية','التمييز بين اللام الشمسية واللام القمرية','تنوين الضم','تنوين الفتح','تنوين الكسر','الشدة','الشدة مع اللام الشمسية','مراجعة التنوين والشدة','التاء المربوطة','التنوين مع التاء المربوطة','المد بالألف','المد بالواو','المد بالياء','مراجعة المدود الثلاثة','مراجعة شاملة على مهارات الفصل','اختبار ختامي ومراجعة'].map((title,index)=>({bookWeek:index+1,title,printedPage:2*(index+1)+2,pdfPage:2*(index+1)+3})),
  ruling:{lightLineOffsetPt:7.9,rowPitchPt:32.18,lightLineWidthPt:0.55},
  warning:'ترتيب الأسابيع في الكتاب يختلف بعد إجازة الخريف عن توزيع المنصة؛ يعتمد المعلم الربط، ولا يغير النظام التوزيع تلقائيًا.'
};
