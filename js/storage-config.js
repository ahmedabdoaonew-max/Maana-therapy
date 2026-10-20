/* ============================================================
   رفع صور الشهادات من الجهاز — مجاني عبر Cloudinary
   (البودكاست والمحاضرات مش محتاجين ده: ملفاتهم بتتحط في فولدر media/ — شوف media/README.txt)

   خطوات التفعيل (مرة واحدة، دقيقتين):
   1) سجّل حساب مجاني على https://cloudinary.com (Sign up for free)
   2) من الصفحة الرئيسية للوحة Cloudinary انسخ "Cloud name" وحطه تحت.
   3) Settings (الترس) ← Upload ← Upload presets ← Add upload preset:
        - Signing mode = Unsigned   (مهم)
        - Folder       = maana      (اختياري)
        - Save
      انسخ اسم الـ preset وحطه تحت.
   بعد كده اصدار الشهادة بيرفع الصور على Cloudinary تلقائياً.
   لو سبتهم فاضيين، الموقع بيكمل يخزّن الصور مصغّرة داخل Firestore زي الأول.
   ============================================================ */
window.MN_CLOUDINARY = {
    cloudName: 'ilf21wt5',   // تم ضبطه ✔
    uploadPreset: 'maana333'   // تم ضبطه ✔
};
