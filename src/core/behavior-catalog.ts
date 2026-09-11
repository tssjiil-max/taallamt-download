import { BehaviorItem } from './domain';

export const CLASSROOM_BEHAVIORS:BehaviorItem[]=[
 {code:'follows_instructions',label:'يلتزم بالتعليمات ويستمع وينفذ',tone:'positive'},
 {code:'participates',label:'يشارك بإيجابية في الدرس',tone:'positive'},
 {code:'cooperates',label:'يتعاون مع المعلم والزملاء',tone:'positive'},
 {code:'late_to_class',label:'تأخر عن الحصة',tone:'needs_attention'},
 {code:'disruptive',label:'تشويش أثناء الحصة',tone:'needs_attention'},
 {code:'uncooperative',label:'عدم التعاون',tone:'needs_attention'},
 {code:'eating',label:'الأكل أثناء الحصة',tone:'needs_attention'},
 {code:'playing',label:'اللعب أثناء الحصة',tone:'needs_attention'},
 {code:'left_class',label:'الخروج من الحصة دون إذن',tone:'needs_attention'}
];

// الغياب المدرسي متعمد أن يكون خارج هذا النظام.
