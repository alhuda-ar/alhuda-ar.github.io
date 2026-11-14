#!/usr/bin/env python3
"""
يولّد كل أيقونات وصور التطبيقين من أيقونة الهدى الرسمية.

الملفات المصدر (لو عايز تغيّر الأيقونة، بدّلهم وشغّل السكريبت تاني):
    assets/brand/icon-transparent.png   الأيقونة بخلفية شفافة (مربع بحواف مدورة)
    assets/brand/icon-full-bg.png       الأيقونة بخلفية كاملة

التشغيل:
    pip install pillow numpy scipy arabic-reshaper python-bidi
    python scripts/make-icons.py

المخرجات:
    assets/android-res/...              أيقونات أندرويد (launcher + adaptive + إشعار + splash)
    electron/build/icon.ico + *.bmp     أيقونة وصور الـ Installer لويندوز
    electron/assets/*                   أيقونة التراي + الشعار للـ Splash
    site/app/logo-mark.png, icon-*.png  الشعار والأيقونة المستخدمين داخل صفحات الموقع
"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, features
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "assets", "brand")
GOLD = (211, 166, 103)
TEAL = (169, 207, 198)
CREAM = (250, 246, 236)
# ألوان الأيقونة الرسمية (مقاسة من الصورة)
G_LIGHT = (16, 97, 71)        # أعلى يسار
G_DARK = (4, 45, 34)          # أسفل يمين
G_SPLASH_TOP = (15, 57, 45)
G_SPLASH_BOT = (1, 28, 23)
RAQM = features.check("raqm")


def out(*p):
    path = os.path.join(ROOT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


# --------------------------------------------------------------------- تحضير المصادر
def load_sources():
    t, f = os.path.join(BRAND, "icon-transparent.png"), os.path.join(BRAND, "icon-full-bg.png")
    if not (os.path.exists(t) and os.path.exists(f)):
        sys.exit("مفيش أيقونات في assets/brand/ — حط icon-transparent.png و icon-full-bg.png")
    return Image.open(t).convert("RGBA"), Image.open(f).convert("RGBA")


def square_icon(im, size):
    """الأيقونة الشفافة بعد قص الحواف الفاضية، في مربع شفاف."""
    box = im.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    im = im.crop(box)
    s = max(im.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    return sq.resize((size, size), Image.LANCZOS)


def extract_logo(im):
    """بيطلّع علامة الشعار (الكتاب + الحرف + النجمة) بخلفية شفافة من الأيقونة."""
    a = np.array(im).astype(float)
    al = a[..., 3] / 255
    bg = np.array([8, 60, 45.])
    m = np.clip((a[..., 0] - 85) / (200 - 85), 0, 1) * al          # الكريمي والذهبي بس
    lab, n = ndimage.label(m > 0.15)                                # شيل لمعة الحواف والبقع الصغيرة
    sizes = ndimage.sum(m > 0.15, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
    m = m * ndimage.binary_dilation(keep, iterations=3)
    rgb = np.clip((a[..., :3] - bg * (1 - m[..., None])) / np.maximum(m[..., None], 0.05), 0, 255)
    logo = Image.fromarray(np.dstack([rgb, m * 255]).astype("uint8"), "RGBA")
    return logo.crop(logo.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox())


def fit(img, box_w, box_h=None):
    """يصغّر الصورة تتناسب مع مستطيل بدون ما تتشوه."""
    box_h = box_h or box_w
    k = min(box_w / img.width, box_h / img.height)
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


def put_center(canvas, img, dy=0):
    canvas.alpha_composite(img, ((canvas.width - img.width) // 2, (canvas.height - img.height) // 2 + dy))


def gradient(size, c1, c2, diagonal=True):
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w]
    t = ((xx / max(w - 1, 1)) * 0.5 + (yy / max(h - 1, 1)) * 0.5) if diagonal else (yy / max(h - 1, 1))
    arr = np.stack([c1[i] * (1 - t) + c2[i] * t for i in range(3)], -1).astype("uint8")
    return Image.fromarray(arr, "RGB").convert("RGBA")


# --------------------------------------------------------------------- الإخراج
def main():
    icon_t, icon_f = load_sources()
    icon = square_icon(icon_t, 1024)           # الأيقونة الشفافة (مربع)
    logo = extract_logo(icon_t)                # علامة الشعار لوحدها

    # ============ الموقع (Splash + معاينة الإشعار) ============
    fit(logo, 640).save(out("site", "app", "logo-mark.png"))
    icon.resize((192, 192), Image.LANCZOS).save(out("site", "app", "icon-192.png"))
    icon.resize((512, 512), Image.LANCZOS).save(out("site", "app", "icon-512.png"))

    # ============ أندرويد ============
    dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for name, k in dens.items():
        px = round(48 * k)
        d = out("assets", "android-res", f"mipmap-{name}")
        os.makedirs(d, exist_ok=True)
        # أيقونة قديمة (أقل من أندرويد 8): الأيقونة الرسمية زي ما هي
        icon.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher.png"))
        # الأيقونة الدايرية: خلفية الأيقونة + الشعار جوه دايرة
        big = px * 4
        disc = gradient((big, big), G_LIGHT, G_DARK)
        put_center(disc, fit(logo, big * 0.62, big * 0.5))
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, big - 1, big - 1), fill=255)
        disc.putalpha(mask)
        disc.resize((px, px), Image.LANCZOS).save(os.path.join(d, "ic_launcher_round.png"))
        # الأيقونة التكيّفية (أندرويد 8+): خلفية متدرجة + شعار في المنطقة الآمنة
        fpx = round(108 * k)
        gradient((fpx, fpx), G_LIGHT, G_DARK).convert("RGB").save(os.path.join(d, "ic_launcher_background.png"))
        fg = Image.new("RGBA", (fpx, fpx), (0, 0, 0, 0))
        put_center(fg, fit(logo, fpx * 0.52, fpx * 0.46))
        fg.save(os.path.join(d, "ic_launcher_foreground.png"))
        # أيقونة الإشعار (شكل أبيض أحادي اللون — شرط أندرويد)
        npx = round(24 * k)
        sil = fit(logo, npx * 0.96, npx * 0.96)
        mono = Image.new("RGBA", sil.size, (255, 255, 255, 0))
        mono.putalpha(sil.getchannel("A").point(lambda v: 255 if v > 90 else 0))
        cv = Image.new("RGBA", (npx, npx), (0, 0, 0, 0))
        put_center(cv, mono)
        cv.save(out("assets", "android-res", f"drawable-{name}", "ic_stat_alhuda.png"))
    # تعريف الأيقونة التكيّفية (بدل اللي في قالب Capacitor)
    adaptive = ('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
    for n in ("ic_launcher.xml", "ic_launcher_round.xml"):
        with open(out("assets", "android-res", "mipmap-anydpi-v26", n), "w") as f:
            f.write(adaptive)
    with open(out("assets", "android-res", "values", "alhuda_colors.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                '    <color name="alhuda_notification">#0F5A43</color>\n'
                '    <color name="ic_launcher_background">#%02X%02X%02X</color>\n</resources>\n' % G_DARK)
    # Splash الثابت (بيظهر لحظات قبل الشاشة المتحركة)
    sp = gradient((1080, 1920), G_SPLASH_TOP, G_SPLASH_BOT, diagonal=False)
    sp.alpha_composite(icon.resize((460, 460), Image.LANCZOS), ((1080 - 460) // 2, (1920 - 460) // 2 - 40))
    sp.convert("RGB").save(out("assets", "android-res", "drawable", "splash.png"))

    # ============ ويندوز ============
    icon_f.convert("RGB").resize((1024, 1024), Image.LANCZOS).save(out("assets", "icon-1024.png"))
    icon.save(out("electron", "build", "icon.png"))
    icon.save(out("electron", "build", "icon.ico"), sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    icon.resize((256, 256), Image.LANCZOS).save(out("electron", "assets", "tray.png"))
    fit(logo, 640).save(out("electron", "assets", "logo-mark.png"))
    make_installer_art(icon)
    print("تمام ✓  اتولّدت كل الأيقونات والصور من الأيقونة الرسمية")


# --------------------------------------------------------------------- صور الـ Installer
def pattern(w, h, cell=46, alpha=34):
    """زخرفة هندسية خفيفة (نجمة ثُمانية مكرّرة) للخلفية."""
    p = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(p)
    for cy in range(-cell, h + cell, cell):
        for cx in range(-cell, w + cell, cell):
            r1, r2 = cell * .46, cell * .2
            pts = [(cx + (r1 if i % 2 == 0 else r2) * math.cos(math.pi * i / 8 - math.pi / 2),
                    cy + (r1 if i % 2 == 0 else r2) * math.sin(math.pi * i / 8 - math.pi / 2)) for i in range(16)]
            d.polygon(pts, outline=TEAL + (alpha,))
            d.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=GOLD + (alpha + 20,))
    return p


def ar(text):
    if RAQM:
        return text
    import arabic_reshaper
    from bidi.algorithm import get_display
    return get_display(arabic_reshaper.reshape(text))


def font(size, bold=True):
    for pth in ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "C:/Windows/Fonts/tahomabd.ttf", "C:/Windows/Fonts/tahoma.ttf"):
        if os.path.exists(pth):
            return ImageFont.truetype(pth, size)
    return ImageFont.load_default()


def text_center(d, cx, y, text, fnt, fill):
    kw = {"direction": "rtl", "language": "ar"} if RAQM else {}
    w = d.textlength(text, font=fnt, **kw)
    d.text((cx - w / 2, y), text, font=fnt, fill=fill, **kw)


def make_installer_art(icon):
    S = 3
    # الشريط الجانبي 164×314
    W, H = 164, 314
    img = gradient((W * S, H * S), G_SPLASH_TOP, G_SPLASH_BOT, diagonal=False)
    img = Image.alpha_composite(img, pattern(W * S, H * S, cell=66, alpha=28))
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((W * S * .1, 38 * S, W * S * .9, 210 * S), fill=GOLD + (70,))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(26 * S)))
    img.alpha_composite(icon.resize((118 * S, 118 * S), Image.LANCZOS), ((W * S - 118 * S) // 2, 52 * S))
    d = ImageDraw.Draw(img)
    text_center(d, W * S / 2, 188 * S, ar("الهُدى"), font(34 * S), CREAM + (255,))
    d.line([(W * S / 2 - 34 * S, 236 * S), (W * S / 2 + 34 * S, 236 * S)], fill=GOLD + (255,), width=2 * S)
    text_center(d, W * S / 2, 248 * S, ar("العربي بقى أسهل"), font(11 * S, False), TEAL + (255,))
    side = img.resize((W, H), Image.LANCZOS).convert("RGB")
    side.save(out("electron", "build", "installerSidebar.bmp"))
    side.save(out("electron", "build", "uninstallerSidebar.bmp"))
    # الهيدر 150×57
    W, H = 150, 57
    h = gradient((W * S, H * S), G_SPLASH_TOP, G_SPLASH_BOT)
    h = Image.alpha_composite(h, pattern(W * S, H * S, cell=45, alpha=24))
    h.alpha_composite(icon.resize((44 * S, 44 * S), Image.LANCZOS), (12 * S, (H - 44) * S // 2))
    d = ImageDraw.Draw(h)
    kw = {"direction": "rtl", "language": "ar"} if RAQM else {}
    d.text((64 * S, 12 * S), ar("الهُدى"), font=font(20 * S), fill=CREAM + (255,), **kw)
    d.text((64 * S, 36 * S), ar("منصة اللغة العربية"), font=font(8 * S, False), fill=TEAL + (255,), **kw)
    h.resize((W, H), Image.LANCZOS).convert("RGB").save(out("electron", "build", "installerHeader.bmp"))


if __name__ == "__main__":
    main()

