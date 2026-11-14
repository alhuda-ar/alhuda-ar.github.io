#!/usr/bin/env python3
"""
بيجهّز مشروع الأندرويد بعد `npx cap add android` وقبل البناء.
(بيتشغّل تلقائي من GitHub Actions — مش لازم تشغّله بإيدك.)

بيعمل:
  1) ينسخ أيقونات الهدى (launcher + adaptive + إشعار + splash) جوه res/
  2) يظبط ثيم شاشة البداية على ألوان الهدى
  3) يضيف صلاحية الإشعارات (أندرويد 13+) وإعدادات إشعارات Firebase في AndroidManifest
  4) يظبط versionCode / versionName
  5) يضيف توقيع نسخة الـ release (من متغيرات البيئة)
  6) يتأكد إن google-services.json موجود وبنفس اسم الحزمة
"""
import argparse, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOBILE = os.path.join(ROOT, "mobile")
APP = os.path.join(MOBILE, "android", "app")
MAIN = os.path.join(APP, "src", "main")
RES = os.path.join(MAIN, "res")


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def step(msg):
    print("•", msg)


def copy_icons():
    src = os.path.join(ROOT, "assets", "android-res")
    # شيل ملفات القالب القديمة اللي هتتعارض مع الجديدة
    for rel in ("drawable-v24/ic_launcher_foreground.xml", "drawable/ic_launcher_background.xml"):
        p = os.path.join(RES, rel)
        if os.path.exists(p):
            os.remove(p)
    for d in os.listdir(RES):
        if re.match(r"drawable-(land|port)-", d):
            sp = os.path.join(RES, d, "splash.png")
            if os.path.exists(sp):
                os.remove(sp)                       # عشان صورة الـ splash الجديدة هي اللي تتستخدم
    n = 0
    for base, _, files in os.walk(src):
        for f in files:
            rel = os.path.relpath(os.path.join(base, f), src)
            dst = os.path.join(RES, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(base, f), dst)
            n += 1
    step(f"اتنسخ {n} ملف أيقونة/صورة")


def patch_styles():
    p = os.path.join(RES, "values", "styles.xml")
    s = read(p)
    if "windowSplashScreenBackground" in s:
        return
    s = s.replace('<item name="android:background">@drawable/splash</item>',
                  '<item name="android:background">@drawable/splash</item>\n'
                  '        <item name="windowSplashScreenBackground">#0A2A22</item>\n'
                  '        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>')
    write(p, s)
    step("ثيم شاشة البداية اتظبط")


def patch_manifest():
    p = os.path.join(MAIN, "AndroidManifest.xml")
    s = read(p)
    if "ic_stat_alhuda" not in s:
        meta = ('        <!-- الهدى: شكل الإشعارات -->\n'
                '        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_alhuda" />\n'
                '        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/alhuda_notification" />\n'
                '        <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="messages" />\n')
        s = s.replace("    </application>", meta + "    </application>")
    if "POST_NOTIFICATIONS" not in s:
        s = s.replace('<uses-permission android:name="android.permission.INTERNET" />',
                      '<uses-permission android:name="android.permission.INTERNET" />\n'
                      '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n'
                      '    <uses-permission android:name="android.permission.VIBRATE" />')
    write(p, s)
    step("AndroidManifest اتظبط (صلاحية الإشعارات + أيقونة ولون الإشعار)")


def patch_gradle(version_code, version_name):
    p = os.path.join(APP, "build.gradle")
    s = read(p)
    s = re.sub(r"versionCode\s+\d+", f"versionCode {version_code}", s, count=1)
    s = re.sub(r'versionName\s+"[^"]*"', f'versionName "{version_name}"', s, count=1)
    if "alhudaRelease" not in s:
        s += '''
// ---- الهدى: توقيع نسخة الـ release (القيم بتيجي من متغيرات البيئة / GitHub Secrets) ----
android {
    signingConfigs {
        alhudaRelease {
            if (System.getenv("KEYSTORE_PATH")) {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("KEYSTORE_PATH")) {
                signingConfig signingConfigs.alhudaRelease
            }
        }
    }
}
'''
    write(p, s)
    step(f"الإصدار: {version_name} (كود {version_code}) + إعداد التوقيع")


def check_google_services():
    p = os.path.join(APP, "google-services.json")
    cfg = json.loads(read(os.path.join(MOBILE, "capacitor.config.json")))
    if not os.path.exists(p) or not read(p).strip():
        print("⚠  google-services.json مش موجود — التطبيق هيتبني، لكن إشعارات الموبايل مش هتشتغل لحد ما تضيفه.")
        return
    try:
        pk = [c["client_info"]["android_client_info"]["package_name"] for c in json.loads(read(p)).get("client", [])]
    except Exception as e:
        sys.exit(f"✗ google-services.json مش ملف صالح: {e}")
    if cfg["appId"] not in pk:
        sys.exit(f"✗ اسم الحزمة في google-services.json ({', '.join(pk) or '—'}) مختلف عن appId في capacitor.config.json ({cfg['appId']}).\n"
                 f"  سجّل تطبيق أندرويد في Firebase بنفس الاسم أو غيّر appId.")
    step(f"google-services.json تمام (الحزمة {cfg['appId']})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version-code", type=int, default=1)
    ap.add_argument("--version-name", default="1.0.0")
    a = ap.parse_args()
    if not os.path.isdir(APP):
        sys.exit("✗ مفيش مشروع أندرويد. شغّل الأول: cd mobile && npx cap add android")
    copy_icons()
    patch_styles()
    patch_manifest()
    patch_gradle(a.version_code, a.version_name)
    check_google_services()
    print("تمام ✓  مشروع الأندرويد جاهز للبناء")


if __name__ == "__main__":
    main()

