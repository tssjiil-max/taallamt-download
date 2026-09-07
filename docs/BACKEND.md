# Backend — المرحلة الأولى

هذه المرحلة تنقل «تعلّمت» تدريجيًا من localStorage إلى Firestore عبر خادم Next.js فقط. المتصفح لا يصل إلى Firestore مباشرة.

## الأمان المعتمد
- Firebase Admin يعمل في الخادم فقط.
- قواعد Firestore الحالية تمنع أي قراءة أو كتابة مباشرة من المتصفح.
- رمز ولي الأمر 6 أرقام لا يُحفظ كنص صريح؛ يُخزن SHA-256 مع secret pepper خاص بالخادم وربط بالطالب.
- جلسة ولي الأمر تستخدم Cookie من نوع HttpOnly + SameSite=Lax، وSecure في الإنتاج.
- لكل طالب جهازان كحد أقصى. حجز الجلسات يتم داخل transaction حتى لا يتجاوز العدد عند تسجيل دخول متزامن.
- جلسة ولي الأمر مرتبطة بطالب واحد فقط، ولا تقبل studentId من المستخدم عند قراءة بيانات البوابة.

## واجهات ولي الأمر الخلفية
- `POST /api/guardian/search` — بحث محدود بالاسم، ويرجع فقط id والاسم والفصل للطلاب المفعّل وصولهم.
- `POST /api/guardian/login` — يتحقق من الرمز على الخادم، يحجز أحد الجهازين، وينشئ جلسة آمنة.
- `GET /api/guardian/me` — يستخرج الطالب من الجلسة نفسها ويعيد حزمة بيانات ولي الأمر فقط.
- `POST /api/guardian/logout` — يبطل الجلسة ويحرر خانة الجهاز.

## المجموعات المستهدفة في Firestore
`terms`, `subjects`, `students`, `weeklyPlans`, `skills`, `assessments`, `resources`, `values`, `valueStars`, `spellingPractices`, `followUps`, `messages`, `guardianSessions`.

في `students/{studentId}` تستخدم حقول وصول ولي الأمر التالية:
- `guardianAccessEnabled`
- `guardianAccessCodeHash`
- `guardianCodeUpdatedAt`
- `guardianSearchName`
- `guardianDeviceLimit` (2)
- `guardianDevices`
- `guardianSessionSlots` — معرفات الجلسات النشطة وتاريخ انتهائها فقط.

## متغيرات البيئة
راجع `.env.example`. القيم الحساسة يجب إضافتها إلى بيئة الاستضافة فقط ولا ترفع إلى GitHub.

## ما بقي قبل التحويل الكامل
1. تهيئة مشروع Firebase وربط متغيرات Firebase Admin في الاستضافة.
2. ترحيل بيانات الفصل الحالية من seed/localStorage إلى المجموعات السابقة.
3. حماية عمليات المعلم بمصادقة معلم حقيقية، ثم نقل الكتابة (التقييم والنجوم والرسائل والموارد) إلى API خادمي.
4. تحويل بوابة ولي الأمر لتستهلك `/api/guardian/*` بدل store المحلي.
5. تشغيل Web Push من الخادم وجدولة خطة السبت و«ماذا لدينا غدًا؟».

لا تُفعّل واجهة الإنتاج لولي الأمر قبل اكتمال الخطوات 1–4؛ الطبقة الخلفية موجودة الآن، لكن البيانات الحالية في الواجهة لا تزال محلية إلى أن تتم الهجرة.
