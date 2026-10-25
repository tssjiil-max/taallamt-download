# ربط «تعلّمت» بـ Firebase من GitHub دون مفتاح دائم

الحالة: مسار الاختبارات وفحص الهوية جاهز في PR #22؛ الربط السحابي والنقل لم ينفّذا بعد. هذا المسار يفحص بيانات إعداد المشروع فقط، ولا ينشر ولا يقرأ مستندات الطلاب ولا يمنح صلاحية تغيير النجوم. لا يوجد مسار نشر إنتاج في هذا التغيير.

## ما يحتاجه مالك الحساب مرة واحدة

يجب فتح **مشروع تعلّمت الموجود فعلًا** في Firebase من جهازك. قارِن `Project ID` و`Project number` و`App ID` لتطبيق الويب مع إعدادات بيئة الموقع التعليمي الحالي في Vercel، خصوصًا `VITE_FIREBASE_PROJECT_ID` و`VITE_FIREBASE_APP_ID`، ومع مشروع حساب خدمة الخادم. لا تنشئ مشروعًا بدلًا منه ولا ترسل مفاتيح خاصة أو رموز دخول في المحادثة.

لا يمكن تفعيل هذه الصلاحية من GitHub وحده: يلزم حساب يملك إدارة IAM في مشروع Google. الصلاحية الجديدة أدناه محصورة بفحص الإعدادات، وليست موافقة على النشر. راجع الأوامر قبل تنفيذها؛ هي تنشئ حساب خدمة ودورًا مخصصًا وتفويض هوية فقط.

## إعداد Google Cloud من Cloud Shell

افتح Cloud Shell من مشروع تعلّمت الصحيح، وضع معرفه الحقيقي في المتغير الأول. تُستخدم أعلام `--project` في كل أمر، فلا يعتمد التنفيذ على مشروع افتراضي. هذه الأوامر لا تنشر تطبيقًا ولا تعدّل قاعدة بيانات.

```bash
TAALLAMT_PROJECT_ID='PUT_THE_VERIFIED_EDUCATIONAL_PROJECT_ID_HERE'
TAALLAMT_PROJECT_NUMBER="$(gcloud projects describe "$TAALLAMT_PROJECT_ID" --format='value(projectNumber)')"
gcloud projects describe "$TAALLAMT_PROJECT_ID" --format='table(projectId,projectNumber,name)'
```

توقف إذا لم تطابق النتيجة إعدادات الموقع التعليمي الحالي. ثم نفذ:

```bash
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firebase.googleapis.com firebasehosting.googleapis.com firestore.googleapis.com --project="$TAALLAMT_PROJECT_ID"

gcloud iam service-accounts create taallamt-audit --display-name='Taallamt migration metadata audit only' --project="$TAALLAMT_PROJECT_ID"

gcloud iam roles create taallamtMigrationMetadata --project="$TAALLAMT_PROJECT_ID" --title='Taallamt migration metadata only' --stage=GA --permissions='firebase.projects.get,firebase.clients.get,firebasehosting.sites.list,datastore.databases.list'

gcloud projects add-iam-policy-binding "$TAALLAMT_PROJECT_ID" --member="serviceAccount:taallamt-audit@${TAALLAMT_PROJECT_ID}.iam.gserviceaccount.com" --role="projects/${TAALLAMT_PROJECT_ID}/roles/taallamtMigrationMetadata" --condition=None

gcloud iam workload-identity-pools create taallamt-audit --project="$TAALLAMT_PROJECT_ID" --location=global --display-name='Taallamt repository metadata audit'

gcloud iam workload-identity-pools providers create-oidc github --project="$TAALLAMT_PROJECT_ID" --location=global --workload-identity-pool=taallamt-audit --issuer-uri='https://token.actions.githubusercontent.com' --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' --attribute-condition="assertion.repository_id == '1358575580' && assertion.repository_owner_id == '308663024' && assertion.ref == 'refs/heads/migration/firebase-hosting-staging-20261025' && assertion.workflow_ref == 'tssjiil-max/taallamt-download/.github/workflows/firebase-staging-check.yml@refs/heads/migration/firebase-hosting-staging-20261025' && assertion.sub == 'repo:tssjiil-max/taallamt-download:environment:firebase-migration-audit' && (assertion.event_name == 'push' || assertion.event_name == 'workflow_dispatch')"

gcloud iam service-accounts add-iam-policy-binding "taallamt-audit@${TAALLAMT_PROJECT_ID}.iam.gserviceaccount.com" --project="$TAALLAMT_PROJECT_ID" --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/${TAALLAMT_PROJECT_NUMBER}/locations/global/workloadIdentityPools/taallamt-audit/attribute.repository_id/1358575580"
```

لا تستخدم `Owner` أو `Editor` أو `Firebase Admin` ولا تمنح الدور `datastore.user`. الدور المخصص لا يتضمن `datastore.entities.get/list/create/update/delete`، ولا صلاحيات نشر أو أسرار أو تعديل IAM. لا يتم إنشاء مفتاح JSON أو تخزين رمز Google دائم.

هذه أوامر تهيئة أولى؛ عند وجود مورد بنفس الاسم افحص إعداداته بدل تجاوز الأخطاء أو توسيع صلاحياته. إذا رفضت Google صلاحية من الدور، احفظ اسم الصلاحية والخطأ فقط لمراجعته، ولا تستبدل الدور بصلاحية أوسع.

## إعداد GitHub

في مستودع `tssjiil-max/taallamt-download` وحده:

1. أنشئ Environment باسم `firebase-migration-audit` من Settings → Environments. اختر مالك الحساب مراجعًا، واسمح بفرع `migration/firebase-hosting-staging-20261025` فقط. لا تفترض وجود الموافقة حتى تتحقق من إعدادها. إن لم تدعم خطة الحساب المراجعين، يبقى التفويض للفحص فقط ولا تستخدمه للإنتاج.
2. أضف المتغيرات التالية إلى Environment. القيم معرفات إعداد، وليست مفاتيح خاصة:

| المتغير | القيمة |
|---|---|
| `TAALLAMT_FIREBASE_PROJECT_ID` | معرف مشروع تعلّمت المتحقق منه |
| `TAALLAMT_FIREBASE_PROJECT_NUMBER` | رقم نفس المشروع |
| `TAALLAMT_FIREBASE_WEB_APP_ID` | App ID الموجود في إعداد الموقع الحالي |
| `TAALLAMT_WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/taallamt-audit/providers/github` |
| `TAALLAMT_AUDIT_SERVICE_ACCOUNT` | `taallamt-audit@PROJECT_ID.iam.gserviceaccount.com` |

3. أضف Repository variable باسم `TAALLAMT_WIF_READY` بالقيمة `true` **بعد** مطابقة إعدادات المشروع. يحتاج شرط تشغيل الـjob متغيرًا على مستوى المستودع، لا Environment فقط.
4. شغّل الاختبارات بدفع التحديث التالي للفرع نفسه؛ سيعمل الفحص بعد نجاحها وبعد موافقة Environment إن كانت مفعّلة. `workflow_dispatch` لا يظهر عادةً قبل تسجيل الملف في الفرع الافتراضي؛ **لا تدمج PR ولا تغيّر الفرع الافتراضي لأجل ذلك**. يمكن دفع commit فارغ إلى فرع التنفيذ بعد الإعداد، أو إبلاغ المنفذ ليضيف نقطة تحقق على الفرع.

الـartifact الوحيد `firebase-metadata-COMMIT_SHA` يحتوي هوية المشروع وتطبيق الويب ومواقع Hosting وقواعد البيانات ومواقعها وحالة PITR المعلنة. لا يحتوي مفاتيح API أو رموز دخول أو سجلات طلاب. المستودع عام؛ لا ترفع exports أو logs تتضمن بيانات شخصية أو محتويات `.env` إليه. بيانات الإعداد المقروءة لا تثبت وحدها أن هذا هو مشروع الإنتاج حتى تقارن بمعرفات الموقع والخادم الحاليين.

## ما يأتي بعد نجاح الفحص

- مراجعة قواعد Firestore والصلاحيات والنسخ الاحتياطي بخطوة تفويض منفصلة عند الحاجة. الفحص الحالي لا يقرأ قواعد الأمان أو وثائق الطلاب ولا يدّعي إثبات حفظ الأرصدة.
- بيئة Staging معزولة في بياناتها وحساب تشغيلها، ومعالجة حماية الكتابة المعتمدة على متغيرات Vercel.
- تكييف جلسات المعلم والطالب لـFirebase Hosting: `taallamt_teacher` و`taallamt_student` لا يكفيان خلف Hosting؛ يجب دعم `__session` دون خلط الهويتين، ثم اختبار CSRF والعزل والصلاحيات. لا تغيّر الجلسات الحالية قبل الاختبار.
- نقل API وعمليات cron ثم اختبارات دخول المعلم والطلاب وروابط أولياء الأمور والنجوم والواجبات والرسائل، وتجربة الرجوع. لا توقف Vercel ولا تغيّر النطاق قبل تحقق هذه الشروط.
- النشر للإنتاج يحتاج هوية نشر منفصلة ومراجعة PR واختبارات وموافقة مالك الحساب. لا توسّع حساب الفحص إلى هوية نشر. بعدها تُنفذ صفحة الدخول الموحدة حسب الطلب.

## إيقاف الربط

أوقف `TAALLAMT_WIF_READY` في GitHub. ولمنع تبادل أي رموز جديدة عطّل الموفر:

```bash
gcloud iam workload-identity-pools providers update-oidc github --project="$TAALLAMT_PROJECT_ID" --location=global --workload-identity-pool=taallamt-audit --disabled
```

تعطيل الموفر لا يلغي رمزًا قصير العمر صدر بالفعل؛ ينتهي رمز هذا المسار بعد عشر دقائق. لم يحدث نقل للبيانات أو تبديل للنطاق ضمن هذه الخطوة.

## المراجع الرسمية

- https://github.com/google-github-actions/auth
- https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://firebase.google.com/docs/reference/firebase-management/rest/v1beta1/projects.webApps/getConfig
- https://firebase.google.com/docs/reference/hosting/rest/v1beta1/projects.sites/list
- https://firebase.google.com/docs/firestore/security/iam
- https://firebase.google.com/docs/hosting/manage-cache
