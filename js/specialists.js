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
    { name: 'د/ شريف أحمد',   role: 'أخصائي صحة نفسية',                 badge: 'أخصائي نفسي',    tags: 'عضو اتحاد المعالجين النفسيين العرب',    photo: 'images/specialists/sherif-ahmed.jpg' },
    { name: 'أ/ سناء عبد السلام', role: 'لايف كوتش تطوير الذات', badge: 'لايف كوتش', tags: '', photo: 'images/specialists/sanaa-abdelsalam.jpg' },
    { name: 'د/ أريج محمود', role: 'أخصائية تخاطب واضطرابات النطق والطلاقة', badge: 'أخصائية تخاطب', tags: '', photo: 'images/specialists/areej-mahmoud.jpg' }
  ].map(function (s, i) { s.builtin = true; s.builtinKey = s.photo; s.order = i + 1; s.buttonText = 'حجز جلسة'; return s; });

  /* دمج الأساسيين مع اللي في قاعدة البيانات:
     - أي أخصائي أساسي اتعدّل من لوحة التحكم (builtinKey) بنعرض نسخته المعدّلة (أو نخفيه لو معطّل)
     - الباقي بيتضاف بالترتيب (order) */
  window.maanaMergeSpecialists = function (extras) {
    extras = extras || [];
    var byKey = {};
    extras.forEach(function (d) { if (d.builtinKey) byKey[d.builtinKey] = d; });
    var list = [];
    window.MAANA_SPECIALISTS.forEach(function (b) {
      var d = byKey[b.builtinKey];
      if (!d) { list.push(b); return; }
      if (d.active === false) return;
      list.push(Object.assign({}, d, { builtin: true }));
    });
    extras.forEach(function (d) { if (!d.builtinKey && d.active !== false) list.push(d); });
    return list
      .map(function (x, i) { return { x: x, i: i }; })
      .sort(function (a, b) { return ((a.x.order || 0) - (b.x.order || 0)) || (a.i - b.i); })
      .map(function (o) { return o.x; });
  };

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
    var own = String((s && s.whatsapp) || '').replace(/[^0-9]/g, '');
    var num = own || (window.SITE_CONTACT && SITE_CONTACT.whatsapp) || '201152013172';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(window.maanaBookingMessage(s));
  };
})();
