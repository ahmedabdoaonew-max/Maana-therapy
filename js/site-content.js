/* ============================================================
   محتوى الصفحة الرئيسية القابل للتعديل من لوحة الإدارة
   - يقرأ settings/general.home (نفس مصدر إعدادات الموقع)
   - أي عنصر عليه data-cms="home.key" يتغيّر نصه
   - data-cms-href يغيّر الرابط، و data-cms-show يخفي/يظهر العنصر
   ============================================================ */
(function () {
    'use strict';
    function val(path) {
        var s = (typeof getSettings === 'function') ? getSettings() : {};
        return s[path.replace('.', '_')];
    }
    function apply() {
        document.querySelectorAll('[data-cms]').forEach(function (el) {
            var v = val(el.getAttribute('data-cms'));
            if (typeof v === 'string' && v.trim()) el.textContent = v.trim();
        });
        document.querySelectorAll('[data-cms-href]').forEach(function (el) {
            var v = val(el.getAttribute('data-cms-href'));
            if (typeof v === 'string' && v.trim()) {
                el.setAttribute('href', v.trim());
                if (/^https?:/i.test(v.trim())) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
            }
        });
        document.querySelectorAll('[data-cms-show]').forEach(function (el) {
            var v = val(el.getAttribute('data-cms-show'));
            el.style.display = (v === false || v === 'false') ? 'none' : '';
        });
    }
    document.addEventListener('DOMContentLoaded', apply);
    document.addEventListener('siteSettingsUpdated', apply);
})();
