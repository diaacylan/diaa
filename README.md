# دولار العراق — واجهة التطبيق الجديدة

## الاختبار على الكمبيوتر
npm install && npm run dev

## بناء نسخة أندرويد (AAB)
1. npm install
2. npm run build:app        (يبني الواجهة ويزامن مع مجلد android)
3. إن لم يكن لديك مجلد android: npx cap add android ثم أعد الخطوة 2
4. افتح مجلد android في Android Studio → Build → Generate Signed Bundle (AAB)

## مهم جداً للتحديث على Google Play
- نفس اسم الحزمة: com.dolariraq.app
- نفس مفتاح التوقيع (keystore) المستخدم في النسخة المنشورة
- versionCode أعلى من الحالي (مثلاً 3) في android/app/build.gradle

## APK تجريبي بدون Android Studio
ارفع المشروع إلى مستودع GitHub، ثم Actions → Build APK → Run workflow.
بعد دقائق نزّل app-debug.apk من Artifacts وثبّته على الهاتف.
