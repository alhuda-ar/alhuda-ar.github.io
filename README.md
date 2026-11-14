# تطبيق الهدى (أندرويد APK + ويندوز EXE)

التطبيقين بيفتحوا **موقع الهدى الحي** (`https://alhuda-ar.github.io`) جوه غلاف Capacitor (أندرويد) وElectron (ويندوز).
يعني أي تعديل تعمله على الموقع يوصل للتطبيقين تلقائياً، ومفيش نسخة تانية من الكود تتصيّن.

---

## 1) هيكل المشروع

```
alhuda-app/
├── site/                      ← ده اللي يترفع على ريبو الموقع (alhuda-ar.github.io)
│   ├── index.html             ← نسختك + سطور تحميل وضع التطبيق ومركز الإشعارات (معدّل)
│   └── app/
│       ├── app-mode.css       ← تنسيق وضع التطبيق (الشريط السفلي، Splash، صفحة اليوتيوب، "النت قاطع")
│       ├── app-mode.js        ← منطق وضع التطبيق (بيشتغل بس جوه التطبيق)
│       ├── notify.js          ← مركز الإشعارات + تبويب "الإشعارات" في لوحة التحكم + تسجيل FCM
│       └── logo-mark.png, icon-192.png, icon-512.png   ← الشعار (متولّدين من أيقونتك الرسمية)
├── mobile/                    ← غلاف الأندرويد
│   ├── capacitor.config.json  ← اسم التطبيق (الهدى) + الحزمة + رابط الموقع
│   ├── package.json
│   └── www/ (index.html, offline.html)   ← صفحة "النت قاطع" لو التطبيق اتفتح من غير نت
├── electron/                  ← غلاف الويندوز
│   ├── main.js                ← النافذة، الـ Splash، الـ Tray، فتح الروابط الخارجية، إعادة المحاولة لو النت قاطع
│   ├── preload.js             ← جسر آمن (openExternal / focus) للصفحة
│   ├── splash.html, offline.html
│   ├── package.json           ← إعدادات الـ NSIS Installer (الصور، اللغة، المجلد...)
│   ├── assets/                ← tray.png + logo-mark.png (متولّدين)
│   └── build/                 ← icon.ico + صور الـ Installer (متولّدين)
├── worker/
│   ├── worker.js              ← Cloudflare Worker لإرسال الإشعارات (مجاني)
│   └── wrangler.toml
├── scripts/
│   ├── make-icons.py          ← بيولّد كل الأيقونات والصور من أيقونتك الرسمية
│   └── prepare-android.py     ← بيظبط مشروع الأندرويد (أيقونات، Manifest، توقيع، رقم الإصدار)
├── assets/
│   ├── brand/                 ← أيقونتك الرسمية (icon-transparent.png + icon-full-bg.png)
│   ├── android-res/           ← أيقونات وSplash الأندرويد (متولّدين)
│   └── icon-1024.png
├── firestore.rules            ← قواعدك الحالية + قسم جديد للإشعارات (notifications) بس
└── .github/workflows/
    ├── android.yml            ← بيبني APK موقّع
    └── windows.yml            ← بيبني EXE Installer
```

## 2) اسم التطبيق واسم الحزمة

- **الاسم اللي بيظهر للمستخدم:** `الهدى` (متظبط في `capacitor.config.json` وفي الـ Installer والـ Tray).
- **اسم الحزمة (appId)** لازم يكون حروف إنجليزي بس (مينفعش عربي): اخترت **`com.alhuda.app`** للأندرويد و`com.alhuda.desktop` للويندوز.
  الطلاب مش هيشوفوه أبداً. بس **لازم تسجل نفس الاسم ده بالظبط في Firebase** (الخطوة 5)، ولو اتنشر التطبيق بعد كده مينفعش يتغير.

## 3) إيه اللي اتعدّل في ملفاتك

- `index.html`: اتضاف **سطر في الـ head** (بيفعّل وضع التطبيق بس لما الـ User-Agent فيه `AlHudaApp`) و**سطرين قبل `</body>`** (تحميل `notify.js` و`app-mode.js`). مفيش أي سطر تاني اتغيّر.
- `firestore.rules`: اتضاف قسم `notifications` بس. أي حد مسجّل يقرأ، والأدمن بس يكتب ويحذف. باقي القواعد زي ما هي.
- `scripts/make-icons.py`: صلّحت خطأ كان بيوقفه (مجلدات الأيقونات مكانتش بتتعمل لوحدها).

## 4) الخطوات (بالترتيب)

### أ) ارفع المشروع على GitHub
1. اعمل ريبو **خاص (Private)** جديد، مثلاً `alhuda-app`، وارفع عليه كل الملفات (من غير مجلد `site`، أو معاه مفيش مشكلة).
   ده ريبو منفصل عن ريبو الموقع، عشان الـ Workflows والأسرار.

### ب) حدّث الموقع
1. في ريبو الموقع `alhuda-ar.github.io`: استبدل `index.html` بالنسخة اللي في `site/`، وارفع مجلد `site/app/` كمجلد اسمه `app` في الجذر.
2. افتح Firebase Console ← Firestore ← Rules، والصق محتوى `firestore.rules` ← Publish.
3. افتح الموقع عادي وجرب إنه شغال زي الأول (هتلاقي جرس الإشعارات اتضاف فقط).

### ج) سجّل تطبيق أندرويد في Firebase (للإشعارات)
1. Firebase Console ← Project settings ← Add app ← Android.
2. اسم الحزمة: `com.alhuda.app` (بالظبط).
3. نزّل `google-services.json`.
4. افتحه بمحرر نصوص وانسخ **محتواه كله** ← GitHub Secret جديد باسم `GOOGLE_SERVICES_JSON`.

### د) أسرار GitHub (في ريبو `alhuda-app`)
Settings ← Secrets and variables ← Actions ← New repository secret:

| الاسم | القيمة |
|---|---|
| `KEYSTORE_BASE64` | السطر الطويل من ملف الأسرار |
| `KEYSTORE_PASSWORD` | من ملف الأسرار |
| `KEY_ALIAS` | من ملف الأسرار |
| `KEY_PASSWORD` | من ملف الأسرار |
| `GOOGLE_SERVICES_JSON` | محتوى ملف `google-services.json` كامل |

> **احتفظ بنسخة من ملف الـ keystore في مكان آمن.** لو ضاع، الطلاب هيضطروا يمسحوا التطبيق ويثبّتوا نسخة جديدة. ومتنشرش الأسرار في أي محادثة أو ملف.

### هـ) فعّل إرسال الإشعارات للموبايل (Cloudflare Worker)
من غير الخطوة دي، الإشعار بيظهر **جوه الموقع والتطبيق** بس، ومش بيوصل لموبايل الطالب وهو مقفول التطبيق.

1. أنشئ حساب Cloudflare مجاني، وثبّت `wrangler`: `npm i -g wrangler` ثم `wrangler login`.
2. من مجلد `worker/`: `wrangler deploy` (هيطلعلك رابط `https://alhuda-push.xxx.workers.dev`).
3. Firebase Console ← Project settings ← Service accounts ← Generate new private key (ملف JSON).
4. من مجلد `worker/`:
   - `wrangler secret put SERVICE_ACCOUNT` والصق محتوى ملف الـ JSON كله.
   - `wrangler secret put ADMIN_EMAILS` والصق إيميلات الأدمن مفصولة بفاصلة (نفس اللي في قواعد Firestore).
5. افتح `site/app/notify.js` وحط الرابط في `PUSH_URL` (سطر 14، من غير `/` في الآخر)، وارفع الملف على ريبو الموقع.

### و) ابنِ التطبيقين
- **الأندرويد:** Actions ← Build Android APK ← Run workflow (اكتب رقم الإصدار، ويزيد في كل تحديث للتطبيق نفسه). الـ APK بيظهر في Artifacts.
- **الويندوز:** Actions ← Build Windows Installer ← Run workflow. الـ EXE بيظهر في Artifacts.

### ز) جرّب قبل التوزيع
- ثبّت الـ APK على موبايل حقيقي: افتح التطبيق، اسمح بالإشعارات، وابعت إشعار تجريبي من لوحة التحكم ← تبويب "الإشعارات".
- جرّب تقفل التطبيق وتبعت إشعار تاني.
- جرّب تفصل النت وتفتح التطبيق (المفروض تظهر صفحة "النت قاطع").
- على الويندوز: ويندوز ممكن يعرض تحذير SmartScreen لأن الـ EXE مش موقّع بشهادة مدفوعة. اختار "More info" ← "Run anyway".

## 5) ملاحظات مهمة

- **الأدوات المطلوبة في الـ Workflow:** Node 22 وJDK 21 (لأن Capacitor 8 بيطلبهم). متظبطين في ملف `android.yml` ومش محتاج تثبّت حاجة على جهازك.
- **أول بناء ممكن يطلع فيه خطأ** بسبب إصدارات الحزم (اتكتبت من غير ما اتجرّبت على GitHub فعلياً). لو حصل، ابعتلي نص الخطأ من تبويب Actions وأصلحه.
- **تغيير الأيقونة:** بدّل الملفين في `assets/brand/` وشغّل `python scripts/make-icons.py` (محتاج `pip install pillow numpy scipy arabic-reshaper python-bidi`).
- **تحديث الموقع** مش محتاج بناء تطبيق جديد. بناء جديد للتطبيق مطلوب بس لو غيّرت الأيقونة أو الاسم أو إعدادات Capacitor/Electron.
- **الإشعارات** بتتبعت لموضوعين (Topics): `all` ولكل صف (`prep1` … `sec2`). الطالب بيتسجل تلقائياً في موضوع صفه.
