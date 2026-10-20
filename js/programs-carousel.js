/* شريط متحرك للبرامج والشهادات — كل شريحة = صورة كاملة (بدون قص) + عنوانها */
(function () {
  var ITEMS = [
    ['cert-01.jpg', 'المقاييس النفسية', 'جامعة عين شمس — 30 ساعة'],
    ['cert-02.jpg', 'ماجستير التربية — علم النفس التربوي', 'معهد البحوث والدراسات العربية — جامعة الدول العربية'],
    ['cert-03.jpg', 'تطبيقات الذكاء الاصطناعي', 'مركز الخدمات التربوية — جامعة الإسكندرية'],
    ['cert-04.jpg', 'برنامج تعديل السلوك الشامل', 'برنامج تدريبي معتمد — 24 ساعة'],
    ['cert-05.jpg', 'دبلومة تنمية الذات وتقدير الذات', 'Human Development & Self-esteem'],
    ['cert-06.jpg', 'تدريب المعلمين ICDL', 'مركز الخدمات التربوية — جامعة الإسكندرية'],
    ['cert-07.jpg', 'إدارة الموارد البشرية', 'معهد الدراسات العليا والبحوث — جامعة الإسكندرية'],
    ['cert-08.jpg', 'تعديل السلوك', 'كلية التربية — جامعة الإسكندرية — 18 ساعة'],
    ['cert-09.jpg', 'تدريب المدربين T.O.T', 'جامعة الإسكندرية'],
    ['cert-10.jpg', 'ممارس البرمجة اللغوية العصبية NLP Practitioner', 'ICNLP — المركز الدولي للبرمجة اللغوية العصبية'],
    ['cert-11.jpg', 'دبلومة البرمجة اللغوية العصبية NLP Diploma', 'ICNLP — المركز الدولي للبرمجة اللغوية العصبية'],
    ['cert-12.jpg', 'العلاج بالتقبل والالتزام ACT', 'La foi for training — 50 ساعة تدريبية'],
    ['cert-13.jpg', 'الإرشاد النفسي', 'La foi for training — 25 ساعة تدريبية'],
    ['cert-14.jpg', 'العلاج بالتقبل والالتزام', 'مؤسسة طلعت سالم للتنمية المستدامة — 50 ساعة'],
    ['cert-15.jpg', 'الدبلوم الخاص في التربية — علم النفس التربوي', 'كلية التربية — جامعة دمنهور'],
    ['cert-16.jpg', 'الدبلوم العام في التربية', 'كلية التربية — جامعة دمنهور']
  ];
  var DELAY = 3800;

  function init() {
    var root = document.getElementById('programsCarousel');
    if (!root) return;
    var cur = 0, timer = null, paused = false;

    var html = '<div class="pc-stage">' +
      '<button type="button" class="pc-nav pc-prev" aria-label="السابق"><i class="fas fa-chevron-right"></i></button>' +
      '<div class="pc-slides">';
    ITEMS.forEach(function (it, i) {
      html += '<figure class="pc-slide' + (i === 0 ? ' on' : '') + '" aria-hidden="' + (i !== 0) + '">' +
        '<div class="pc-img"><img src="images/programs/' + it[0] + '" alt="' + it[1] + '"' +
        (i === 0 ? '' : ' loading="lazy"') + ' decoding="async"></div>' +
        '<figcaption><h3>' + it[1] + '</h3><p>' + it[2] + '</p></figcaption></figure>';
    });
    html += '</div><button type="button" class="pc-nav pc-next" aria-label="التالي"><i class="fas fa-chevron-left"></i></button></div>' +
      '<div class="pc-dots">';
    ITEMS.forEach(function (it, i) {
      html += '<button type="button" class="pc-dot' + (i === 0 ? ' on' : '') + '" aria-label="' + it[1] + '"></button>';
    });
    html += '</div>';
    root.innerHTML = html;

    var slides = root.querySelectorAll('.pc-slide');
    var dots = root.querySelectorAll('.pc-dot');

    function go(n) {
      cur = (n + ITEMS.length) % ITEMS.length;
      slides.forEach(function (s, i) {
        s.classList.toggle('on', i === cur);
        s.setAttribute('aria-hidden', i !== cur);
      });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === cur); });
      var nx = slides[(cur + 1) % slides.length].querySelector('img');
      if (nx) nx.loading = 'eager';
    }
    function start() {
      stop();
      timer = setInterval(function () { if (!paused) go(cur + 1); }, DELAY);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }

    root.querySelector('.pc-prev').addEventListener('click', function () { go(cur - 1); start(); });
    root.querySelector('.pc-next').addEventListener('click', function () { go(cur + 1); start(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); start(); }); });
    root.addEventListener('mouseenter', function () { paused = true; });
    root.addEventListener('mouseleave', function () { paused = false; });

    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; paused = true; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      paused = false;
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(dx > 0 ? cur - 1 : cur + 1); start(); }
    }, { passive: true });

    start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
