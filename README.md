# Maana Therapy — معنى ثيرابي

**الشعار:** معني لكل حكايه

منصة ويب عربية (RTL) متخصصة في الصحة النفسية والروحية، الجلسات النفسية، الحالات السريرية، الاختبارات النفسية، والمحاضرات الأونلاين.

---

## الهوية البصرية

| اللون | الكود |
|-------|-------|
| أخضر زيتوني غامق | `#333A26` |
| موف وردي باهت | `#B99A9B` |
| بيج فاتح | `#E8D8BE` |
| ذهبي دافئ | `#D5B477` |
| أوف وايت | `#F8F3EA` |

---

## الميزات الرئيسية

- **تسجيل الدخول** بالاسم + رقم الهاتف فقط
- **زر تواصل عائم** (كرة متحركة) يفتح روابط واتساب + فيسبوك + تيك توك + إنستجرام + يوتيوب
- **الأقسام**: أطباء الجلسات النفسية، الصحة النفسية والروحية، سلي نفسك، حالات سريرية، الاختبارات النفسية
- **نظام الشهادات**
- **نظام الإدارة (Admin)**
- **نظام المحاضرات الأونلاين** (`online-lectures.html`)
- **الاشتراك والمحاضرات بموافقة الإدارة عبر واتساب** (بدون دفع أونلاين)
- **7 أسئلة شائعة** مخصصة للمنصة

---

## البودكاست

- الصفحة العامة: `podcast.html` — أقسام فرعية (تبويبات) + حلقات صوت/فيديو + مشغّل داخل الصفحة
- كل الحلقات **بموافقة الإدارة**: المستخدم يضغط "طلب سماع" فيفتح واتساب برسالة فيها (الاسم، الهاتف، البريد، ID الحساب، ID الحلقة) ← الأدمن يضغط "تفعيل" من لوحة التحكم فتتفتح على حسابه. (ممكن تعلّم حلقة "مفتوحة للجميع")
- ملفات الحلقات والمحاضرات بتتحط في مجلد `media/` بالمشروع، ويتكتب مسارها في لوحة التحكم (راجع `media/README.txt`)
- صور الشهادات بتترفع **من الجهاز** على Cloudinary المجاني (فعّله من `js/storage-config.js`)
- باقة المحاضرات = **4 أقسام فقط** (`online-lectures.html`)، و`lectures.html` بيحوّل لها
- رقم التواصل الموحّد لكل الموقع: `01152013172` — معرّف في أول `js/app.js` (`SITE_CONTACT`)

---

## الروابط

- واتساب: 01152013172
- فيسبوك: https://www.facebook.com/share/1EhGyn6SYy/
- تيك توك: https://www.tiktok.com/@manamgdowxc
- إنستجرام: https://www.instagram.com/ma3na2026
- يوتيوب: https://youtube.com/@mana-j2q6e

---

## التشغيل

افتح `index.html` مباشرة أو ارفع المجلد على أي استضافة ثابتة (Vercel / Firebase Hosting) — كلها مجانية.


---

© 2026 Maana Therapy

---

## هيكل المشروع (بعد إعادة التنظيم)

```
/                    صفحات الموقع (HTML)
│                    الصحة النفسية والروحية: mental-health.html (القائمة) + quran / athkar /
│                    daily-wird / prayer-times / progress / achievements (كل قسم صفحة مستقلة)
├── css/main.css     ملف التصميم الوحيد — الفهرس في أوله، ولتغيير الألوان عدّل :root في القسم 4
├── js/              سكريبتات الصفحات (app, auth, courses, admin ...)
│                    float.js = زر التواصل العائم (روابطه في أول الملف)
├── images/          favicon.svg + icons/ (أيقونات التطبيق)
├── data/            بيانات ثابتة
├── skills-module/   وحدة تنمية المهارات (لها skills.css مستقل عن main.css)
├── firestore.rules  قواعد الأمان لكل المجموعات (انسخها في Firebase Console)
├── firestore.indexes.json  فهرس الإشعارات
└── firebase.json    إعداد النشر (rules + hosting اختياري)
```

ملاحظة: عند تعديل `css/main.css` غيّر رقم النسخة في الروابط (`main.css?v=1`) أو اسم الملف، لأن المتصفح بيخزّن ملفات css لفترة.


---

## إعداد Firebase (خطة Spark المجانية — بدون بطاقة ولا Blaze)

الموقع بيستخدم **Authentication + Firestore فقط**. مفيش Storage ولا Cloud Functions.

1. **المشروع:** console.firebase.google.com ← Add project (أو استخدم مشروعك الحالي).
2. **تطبيق ويب:** Project settings ← Your apps ← `</>` ← انسخ ال config والصقه في `js/firebase-config.js`.
3. **Authentication:** Build ← Authentication ← Sign-in method ← فعّل **Email/Password**، وضيف دومين موقعك في Settings ← Authorized domains.
4. **Firestore:** Build ← Firestore Database ← Create database (Production mode).
5. **القواعد:** Firestore ← Rules ← الصق محتوى `firestore.rules` ← Publish.
6. **الفهرس:** أول ما إشعارات المستخدم تظهر خطأ في ال Console، افتح الرابط اللي فيه وأنشئ الفهرس (أو `firebase deploy --only firestore`).
7. **أول أدمن:** سجّل حساب من الموقع ← Firestore ← `users/{uid}` ← غيّر `role` إلى `super_admin`.
8. **النشر:** ارفع المجلد على Vercel أو `firebase deploy --only hosting`.

### ملاحظات الأمان (بدون Functions)
- رابط محاضرات الموافقة محمي بالقواعد: مش بيتقرأ إلا بعد ما الأدمن يوافق على طلب المستخدم.
- حدّ عدد المشاهدات (`maxViews`) للمحاضرات العادية مبقاش بيتطبّق (كان بيعتمد على Function)؛ محاضرات المجموعات والأونلاين لسه عندها عدّاد.
- روابط محاضرات المجموعات والأونلاين مخزّنة في مستندات عامة (حماية بالكود فقط) — استخدم روابط يوتيوب «غير مدرجة» (Unlisted).


---

## السيو (Google Search Console + الذكاء الاصطناعي + معاينة الروابط)

الملفات الجاهزة: `robots.txt` و`sitemap.xml` و`llms.txt` و`images/og-image.jpg` (صورة المعاينة 1200×630) ووسوم Open Graph / Twitter / JSON-LD في كل صفحة عامة. الصفحات الخاصة (أدمن، تسجيل، ملف شخصي، مشاهدة، شهادة، قسم/قسم فرعي) عليها `noindex`.

> الدومين المكتوب في كل الملفات: `https://maana-therapy.vercel.app` — لو هتستخدم دومين تاني استبدله في كل الملفات (بحث واستبدال شامل).

**بعد النشر على Vercel:**
1. افتح search.google.com/search-console ← Add property ← **URL prefix** ← اكتب رابط الموقع.
2. اختار التحقق ب **HTML tag** وانسخ سطر `<meta name="google-site-verification" ...>` والصقه في `index.html` مكان التعليق الموجود في ال `<head>`، وانشر تاني، ثم Verify.
3. من Sitemaps أضف `sitemap.xml` ثم Submit.
4. من URL Inspection اكتب رابط الصفحة الرئيسية ← **Request indexing** (وكرر مع الصفحات المهمة).
5. اختبر المعاينة: developers.facebook.com/tools/debug (فيسبوك/واتساب) — اضغط Scrape Again بعد أي تغيير في الصورة.
6. اختبر البيانات المنظّمة: search.google.com/test/rich-results.
7. اختياري: Bing Webmaster Tools ← Import from Google Search Console (بيفيد ظهور الموقع في ChatGPT/Copilot لأنهم بيعتمدوا على فهرس Bing).
