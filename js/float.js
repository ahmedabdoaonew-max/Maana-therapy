/* ==========================================================
   زر التواصل العائم — Maana Therapy
   - مصدر واحد للروابط (عدّلها من هنا فقط)
   - يُنشئ الزر تلقائيًا في كل صفحة تحمّل هذا الملف
   ========================================================== */
(function () {
  'use strict';
  if (document.getElementById('maanaFloat')) return;

  var LINKS = [
    { cls: 'whatsapp',  icon: 'fab fa-whatsapp',    label: 'واتساب',   href: 'https://wa.me/201152013172' },
    { cls: 'facebook',  icon: 'fab fa-facebook-f',  label: 'فيسبوك',   href: 'https://www.facebook.com/share/1EhGyn6SYy/' },
    { cls: 'instagram', icon: 'fab fa-instagram',   label: 'إنستجرام', href: 'https://www.instagram.com/ma3na2026' },
    { cls: 'tiktok',    icon: 'fab fa-tiktok',      label: 'تيك توك',  href: 'https://www.tiktok.com/@manamgdowxc' },
    { cls: 'youtube',   icon: 'fab fa-youtube',     label: 'يوتيوب',   href: 'https://youtube.com/@mana-j2q6e' }
  ];

  // روابط التواصل قابلة للتعديل من لوحة الإدارة (settings.social_*) — الافتراضي هو الموجود أعلاه
  function applyCustomLinks() {
    var cache = {};
    try { cache = JSON.parse(localStorage.getItem('academySettingsCache') || '{}'); } catch (e) {}
    LINKS.forEach(function (l) {
      var v = cache['social_' + l.cls];
      var a = document.querySelector('#maanaFloat .maana-float-link.' + l.cls);
      if (l.cls === 'whatsapp') return; // رقم الواتساب موحّد: 01152013172
      if (a && typeof v === 'string' && v.trim()) a.href = v.trim();
    });
  }

  var wrap = document.createElement('div');
  wrap.className = 'maana-float-wrap';
  wrap.id = 'maanaFloat';

  var html = '<div class="maana-float-scrim" aria-hidden="true"></div>' +
             '<div class="maana-float-links" id="maanaFloatLinks">';
  LINKS.forEach(function (l, i) {
    html += '<a class="maana-float-link ' + l.cls + '" style="--i:' + i + '" href="' + l.href +
            '" target="_blank" rel="noopener" aria-label="' + l.label + '" data-label="' + l.label + '" tabindex="-1">' +
            '<i class="' + l.icon + '"></i></a>';
  });
  html += '</div>' +
          '<button type="button" class="maana-float-ball" id="maanaFloatBall" aria-label="تواصل معنا" aria-expanded="false" aria-controls="maanaFloatLinks">' +
            '<span class="mf-ring" aria-hidden="true"></span>' +
            '<span class="mf-pulse" aria-hidden="true"></span>' +
            '<span class="mf-spark s1" aria-hidden="true">✦</span>' +
            '<span class="mf-spark s2" aria-hidden="true">✦</span>' +
            '<span class="mf-spark s3" aria-hidden="true">✦</span>' +
            '<span class="mf-face"><i class="fas fa-comments mf-ic-open"></i><i class="fas fa-xmark mf-ic-close"></i></span>' +
          '</button>';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  applyCustomLinks();
  document.addEventListener('siteSettingsUpdated', applyCustomLinks);

  var ball  = wrap.querySelector('.maana-float-ball');
  var links = wrap.querySelectorAll('.maana-float-link');

  function setOpen(open) {
    wrap.classList.toggle('is-open', open);
    ball.setAttribute('aria-expanded', open ? 'true' : 'false');
    links.forEach(function (a) { a.tabIndex = open ? 0 : -1; });
    if (open) {            // وميض خفيف عند الفتح
      wrap.classList.remove('burst'); void wrap.offsetWidth; wrap.classList.add('burst');
    }
  }

  ball.addEventListener('click', function () {
    setOpen(!wrap.classList.contains('is-open'));
  });

  // إغلاق عند الضغط خارج الزر (بدون الاعتماد على عناصر قد تُستبدل)
  document.addEventListener('pointerdown', function (e) {
    if (wrap.classList.contains('is-open') && !wrap.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  // بعد الضغط على رابط نقفل القائمة (الرابط نفسه بيفتح في تبويب جديد)
  links.forEach(function (a) {
    a.addEventListener('click', function () { setTimeout(function () { setOpen(false); }, 150); });
  });
})();
