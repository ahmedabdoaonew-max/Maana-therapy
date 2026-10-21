/* حركة هادئة واحترافية: ظهور تدريجي عند التمرير + شريط تقدّم القراءة */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var bar = document.createElement('div');
  bar.className = 'mm-progress';
  bar.setAttribute('aria-hidden','true');
  document.body.appendChild(bar);
  var ticking = false;
  function upd(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(upd); } }, {passive:true});
  upd();

  var SEL = [
    '.sections-area .section-header','#sections-grid .section-card',
    '#lecturesHubGrid .section-img','#lecturesHubGrid .program-card-body',
    '.ses-banner-in','.pc-banner-in','.pst-section .section-header','.pst-card',
    '.doctor-card','.faq-section .section-header','.faq-item','.mn-paths-grid > *','.mn-wide','.footer-inner'
  ].join(',');

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('mm-in');
      io.unobserve(el);
      setTimeout(function(){ el.classList.add('mm-done'); }, 1400);
    });
  }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});

  function scan(){
    var items = document.querySelectorAll(SEL);
    Array.prototype.forEach.call(items, function(el){
      if (el.dataset.mm) return;
      el.dataset.mm = '1';
      var sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--mm-i', Math.min(sib % 4, 3));
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * .9 && r.bottom > 0) { el.classList.add('mm-in','mm-done'); return; }
      el.classList.add('mm-reveal');
      io.observe(el);
    });
  }
  var t;
  function later(){ clearTimeout(t); t = setTimeout(scan, 150); }
  new MutationObserver(later).observe(document.body, {childList:true, subtree:true});
  scan();
})();
