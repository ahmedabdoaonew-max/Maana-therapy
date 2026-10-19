/**
 * قسم الحالات السريرية التشخيصية التعليمية
 * JavaScript نظيف وسهل التعديل
 */

(function () {
  'use strict';

  const startBtn = document.getElementById('start-vignettes-btn');
  const content = document.getElementById('cv-content');
  const tabs = document.querySelectorAll('.cv-tab');
  const cases = document.querySelectorAll('.cv-case');
  const prevBtn = document.getElementById('cv-prev');
  const nextBtn = document.getElementById('cv-next');
  const progress = document.getElementById('cv-progress');
  const revealBtns = document.querySelectorAll('.cv-reveal-btn');

  let currentCase = 1;
  const totalCases = 6;

  // زر البدء الرئيسي
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      content.classList.remove('hidden');
      startBtn.parentElement.style.display = 'none';
      // تمرير سلس إلى بداية المحتوى
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // التبويبات
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const caseNum = parseInt(this.dataset.case, 10);
      goToCase(caseNum);
    });
  });

  // أزرار التنقل
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentCase > 1) goToCase(currentCase - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentCase < totalCases) goToCase(currentCase + 1);
    });
  }

  function goToCase(num) {
    currentCase = num;

    // تحديث التبويبات
    tabs.forEach(function (t) {
      t.classList.toggle('active', parseInt(t.dataset.case, 10) === num);
    });

    // تحديث الحالات
    cases.forEach(function (c) {
      c.classList.toggle('active', parseInt(c.dataset.case, 10) === num);
    });

    // تحديث أزرار التنقل
    if (prevBtn) prevBtn.disabled = (num === 1);
    if (nextBtn) nextBtn.disabled = (num === totalCases);
    if (progress) progress.textContent = num + ' / ' + totalCases;

    // تمرير سلس لأعلى الحالة النشطة
    const activeCase = document.getElementById('case-' + num);
    if (activeCase) {
      activeCase.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // إظهار / إخفاء التحليل النموذجي
  revealBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = this.dataset.target;
      const analysis = document.getElementById(targetId);
      if (analysis) {
        analysis.classList.toggle('hidden');
        this.textContent = analysis.classList.contains('hidden')
          ? 'أظهر التحليل النموذجي'
          : 'إخفاء التحليل النموذجي';
      }
    });
  });
})();
