/* يخلّي عرض "Maعna Therapy" وسطر "معنى ثيرابي" متساويين في الهيدر والفوتر */
(function () {
  function fit() {
    var list = document.querySelectorAll('.logo .logo-names, .footer h4 .logo-names');
    for (var i = 0; i < list.length; i++) {
      var n = list[i], en = n.querySelector('.logo-en'), ar = n.querySelector('.logo-ar');
      if (!en || !ar || !n.offsetParent) continue;
      ar.style.removeProperty('font-size');
      en.style.display = ar.style.display = 'inline-block';
      var we = en.getBoundingClientRect().width, wa = ar.getBoundingClientRect().width;
      var fs = parseFloat(getComputedStyle(ar).fontSize);
      if (we > 0 && wa > 0 && fs) {
        var r = Math.max(0.7, Math.min(2, we / wa));
        ar.style.setProperty('font-size', (fs * r).toFixed(2) + 'px', 'important');
      }
    }
  }
  function run() { fit(); }
  if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('load', run);
  window.addEventListener('resize', function () { clearTimeout(run.t); run.t = setTimeout(fit, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
})();
