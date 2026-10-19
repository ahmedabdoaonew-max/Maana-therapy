/* بوابة اختيارية — تسجيل الدخول غير إجباري */
(function () {
    // لا يتم إجبار المستخدم على تسجيل الدخول
    // الصفحات متاحة للجميع، وبعض الميزات فقط تحتاج تسجيل دخول
    var st = document.getElementById('authGateStyle');
    if (st) st.remove();
    if (document.documentElement) {
        document.documentElement.style.visibility = 'visible';
    }
})();
