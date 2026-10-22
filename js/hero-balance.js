/* كتابة النص بالتتابع (تأثير الآلة الكاتبة) لهيرو "رحلتك نحو التوازن" */
(function () {
    'use strict';
    var root = document.getElementById('balance');
    if (!root) return;
    var h = document.getElementById('balTitle');
    var p = document.getElementById('balDesc');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setting(k, fallback) {
        try {
            var s = (typeof getSettings === 'function') ? getSettings() : {};
            var v = s && s['home_' + k];
            return (typeof v === 'string' && v.trim()) ? v.trim() : fallback;
        } catch (e) { return fallback; }
    }
    var titleText = setting('balTitle', h.textContent.trim());
    var descText = setting('balDesc', p.textContent.trim());
    var started = false, finished = false;

    function finish() {
        finished = true;
        h.textContent = titleText; p.textContent = descText;
        root.classList.remove('bal-pending');
    }
    if (reduce) { finish(); return; }

    root.classList.add('bal-pending');
    h.setAttribute('aria-label', titleText); p.setAttribute('aria-label', descText);
    h.innerHTML = ''; p.innerHTML = '';

    function type(el, text, speed, done) {
        var t = document.createElement('span'); t.setAttribute('aria-hidden', 'true');
        var c = document.createElement('span'); c.className = 'bal-caret'; c.setAttribute('aria-hidden', 'true');
        el.appendChild(t); el.appendChild(c);
        var i = 0;
        (function step() {
            if (finished) return;
            i++; t.textContent = text.slice(0, i);
            if (i < text.length) {
                var ch = text.charAt(i - 1);
                setTimeout(step, speed + (/[،,.؟!]/.test(ch) ? 260 : (ch === ' ' ? 25 : 0)));
            } else { c.remove(); if (done) setTimeout(done, 250); }
        })();
    }
    function run() {
        if (started) return; started = true;
        var delay = document.documentElement.classList.contains('splash-active') ? 2600 : 400;
        setTimeout(function () {
            type(h, titleText, 70, function () {
                type(p, descText, 22, function () { root.classList.remove('bal-pending'); });
            });
        }, delay);
    }
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) { io.disconnect(); run(); }
        }, { threshold: 0.2 });
        io.observe(root);
    } else { run(); }
    setTimeout(run, 4000); // أمان

    // لو الأدمن غيّر النص من لوحة التحكم بعد الانتهاء
    document.addEventListener('siteSettingsUpdated', function () {
        var nt = setting('balTitle', titleText), nd = setting('balDesc', descText);
        if (finished && (nt !== titleText || nd !== descText)) { titleText = nt; descText = nd; h.textContent = nt; p.textContent = nd; }
        else if (!started) { titleText = nt; descText = nd; }
    });
})();
