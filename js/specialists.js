/* ============================================================
   أخصائيو معنى — مصدر واحد للبيانات (الرئيسية + صفحة "جلستك النفسية")
   - لإضافة/تعديل أخصائي: عدّل القائمة تحت (الصورة في images/specialists/).
   - رسالة الواتساب بتتجهز تلقائيًا من الاسم والتخصص.
   - الأخصائيون اللي بيتضافوا من لوحة التحكم بيظهروا بعد دول.
   ============================================================ */
(function () {
  'use strict';

  window.MAANA_SPECIALISTS = [
    { name: 'د/ شيرين توكل',  role: 'استشاري نفسي، أسري وإرشاد زواجي', badge: 'استشاري نفسي',   tags: '',                                      photo: 'images/specialists/sherine-tawakol.jpg' },
    { name: 'صباح الشافعي',   role: 'أخصائي نفسي وتربية خاصة',          badge: 'أخصائي نفسي',    tags: '',                                      photo: 'images/specialists/sabah-elshafei.jpg' },
    { name: 'لمى بيدس',       role: 'أخصائي نفسي وتطوير ذات',           badge: 'أخصائي نفسي',    tags: '',                                      photo: 'images/specialists/lama-bides.jpg' },
    { name: 'د/ شريف أحمد',   role: 'أخصائي صحة نفسية',                 badge: 'أخصائي نفسي',    tags: 'عضو اتحاد المعالجين النفسيين العرب',    photo: 'images/specialists/sherif-ahmed.jpg' }
  ].map(function (s, i) { s.builtin = true; s.order = i + 1; s.buttonText = 'حجز جلسة'; return s; });

  /* كروت الأمثلة القديمة (مثال 1 / 2 / 3) ما تظهرش تاني */
  window.maanaIsPlaceholder = function (name) {
    return /\(\s*مثال\s*\d*\s*\)/.test(String(name || ''));
  };

  /* رسالة الحجز الجاهزة: الاسم + التخصص (+ اسم وهاتف المستخدم لو مسجّل دخول) */
  window.maanaBookingMessage = function (s) {
    var msg = 'السلام عليكم، أرغب في حجز جلسة نفسية مع ' + (s.name || '') + (s.role ? ' — ' + s.role : '') + '.';
    try {
      var u = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
      if (u && u.name) msg += '\nالاسم: ' + u.name + (u.phone ? '\nالهاتف: ' + u.phone : '');
    } catch (e) {}
    return msg;
  };

  window.maanaBookingUrl = function (s) {
    var num = (window.SITE_CONTACT && SITE_CONTACT.whatsapp) || '201152013172';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(window.maanaBookingMessage(s));
  };
})();
