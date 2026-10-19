/* رقم التواصل الموحّد لكل الموقع (واتساب + اتصال) — عدّله من هنا فقط */
/* الدفع الأونلاين: false = كل المحاضرات بموافقة الإدارة (واتساب). غيّرها إلى true عند تفعيل الدفع */
window.ONLINE_PAYMENT_ENABLED = false;
window.SITE_CONTACT = { whatsapp: '201152013172', display: '01152013172', tel: '+201152013172' };

/* ============================================
   Maana Therapy - التطبيق الرئيسي
   app.js - البيانات الأساسية والوظائف المشتركة
   ============================================ */

// ========== تسجيل Service Worker لتفعيل تثبيت التطبيق (PWA) عبر جوجل كروم ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function (err) {
            console.warn('[PWA] تعذّر تسجيل Service Worker:', err);
        });
    });
}


// ========== تسجيل الدخول اختياري (غير إجباري) ==========
// يمكن لأي زائر تصفح الموقع بحرية. تسجيل الدخول مطلوب فقط لبعض الميزات المدفوعة.
(function () {
    var st = document.getElementById('authGateStyle');
    if (st) st.remove();
    if (document.documentElement) {
        document.documentElement.style.visibility = 'visible';
    }
})();

// ========== تنبيهات عامة (تُستخدم في كل الصفحات) ==========
function showToast(message, type) {
    let el = document.getElementById('globalToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'globalToast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = message || '';
    el.className = 'toast' + (type ? ' ' + type : '');
    void el.offsetWidth; // إعادة تشغيل الانتقال (transition) عند تكرار نفس الرسالة
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ========== شاشة الترحيب (Splash): تفضل ظاهرة لحد ما الموقع يخلص تحميل بالكامل ==========
function hideSplash() {
    var splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
    document.documentElement.classList.remove('splash-active');
}

(function () {
    var MIN_SHOW = 900;      // أقل مدة عرض (ms) عشان الصورة تتشاف
    var MAX_WAIT = 20000;    // أمان: لو الشبكة بطيئة جداً مانفضلش عالقين للأبد
    var started = Date.now();
    var done = false;

    function finish() {
        if (done) return;
        done = true;
        var wait = Math.max(0, MIN_SHOW - (Date.now() - started));
        setTimeout(hideSplash, wait);
    }

    function whenSplashImageReady() {
        return new Promise(function (resolve) {
            var img = document.querySelector('#splash .splash-img');
            if (!img || (img.complete && img.naturalWidth)) return resolve();
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve);
        });
    }

    function whenFullyLoaded() {
        // load = كل الصور والستايل والسكريبتات اتحملت
        var loaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise(function (r) { window.addEventListener('load', r); });
        // الخطوط كمان لازم تجهز
        var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        return Promise.all([loaded, fonts, whenSplashImageReady()]);
    }

    whenFullyLoaded().then(finish, finish);
    setTimeout(finish, MAX_WAIT);
})();

// ========== إعدادات الموقع (تُخزَّن وتُقرأ من Firestore حتى تظهر فوراً لكل زوار الموقع، مش بس جهاز الأدمن) ==========
let __siteSettingsCache = {};
try {
    __siteSettingsCache = JSON.parse(localStorage.getItem('academySettingsCache') || '{}');
} catch (e) {
    __siteSettingsCache = {};
}

// إرجاع نسخة من الإعدادات الحالية (متاحة فوراً من الكاش المحلي بدون انتظار الشبكة)
function getSettings() {
    return __siteSettingsCache || {};
}

// ========== المستخدم الحالي من الكاش المحلي (auth.js يحدّثه عند تغيّر حالة الدخول) ==========
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('currentUser') || 'null');
    } catch (e) {
        return null;
    }
}

// حفظ الإعدادات في Firestore حتى تنتشر فوراً لكل من يتصفح الموقع الآن
function saveSettings(newSettings) {
    __siteSettingsCache = Object.assign({}, __siteSettingsCache, newSettings);
    try { localStorage.setItem('academySettingsCache', JSON.stringify(__siteSettingsCache)); } catch (e) {}
    if (typeof db !== 'undefined' && db) {
        db.collection('settings').doc('general').set(__siteSettingsCache, { merge: true }).catch(function (err) {
            console.error('تعذر حفظ إعدادات الموقع:', err);
        });
    }
}

// مزامنة لحظية: أي تعديل يحفظه الأدمن (لوجو / شاشة ترحيب / صورة الموقع / أيقونة البرنامج...) يظهر فوراً لكل زائر بدون إعادة تحميل الصفحة
function initSiteSettingsSync() {
    if (typeof db === 'undefined' || !db) return;
    db.collection('settings').doc('general').onSnapshot(function (doc) {
        if (!doc.exists) return;
        __siteSettingsCache = Object.assign({}, __siteSettingsCache, doc.data());
        try { localStorage.setItem('academySettingsCache', JSON.stringify(__siteSettingsCache)); } catch (e) {}
        if (typeof applyBrandingImages === 'function') applyBrandingImages();
        try { document.dispatchEvent(new CustomEvent('siteSettingsUpdated')); } catch (e) {}
        // لو الأدمن فاتح تبويب الإعدادات في نفس اللحظة، حدّث الحقول المعروضة
        if (typeof loadAdminSettings === 'function' && document.getElementById('settingCvUrl')) {
            loadAdminSettings();
        }
    }, function (err) {
        console.warn('تعذرت مزامنة إعدادات الموقع:', err);
    });
}

// ========== رابط السيرة الذاتية (قابل للتعديل من الأدمن) ==========
let cvUrl = "https://example.com/international-academy-cv.pdf";

/* ============================================================
   🖼️ صور الهوية البصرية — عدّل الروابط هنا بسهولة
   ضع رابط صورة أو مسار محلي مثل: images/logo.png
   اتركه فارغاً '' لاستخدام الأيقونة الافتراضية
   ============================================================ */
const SITE_BRANDING = {
    // صورة دائرية في شاشة الترحيب (Splash)
    splashImage: '',

    // لوجو الهيدر بجانب الاسم / تسجيل الدخول
    logoImage: '',

    // صورة لكل قسم رئيسي (1 إلى 13)
    sectionImages: {
        1:  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
        2:  'https://images.unsplash.com/photo-1544367563-12126dbcbb4a?w=600&h=400&fit=crop',
        3:  'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&h=400&fit=crop',
        4:  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&h=400&fit=crop',
        5:  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop',
        6:  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=400&fit=crop',
        7:  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop',
        8:  'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&h=400&fit=crop',
        9:  'https://images.unsplash.com/photo-1474418397713-7ede21c59118?w=600&h=400&fit=crop',
        10: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
        11: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
        12: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&h=400&fit=crop',
        13: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=400&fit=crop',
        14: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop'
    }
};

function applyBrandingImages() {
    var settings = {};
    try { settings = getSettings() || {}; } catch (e) {}
    var splashUrl = settings.splashImage || SITE_BRANDING.splashImage || '';
    var logoUrl = settings.logoImage || SITE_BRANDING.logoImage || '';
    var siteImageUrl = settings.siteImage || '';
    var appIconUrl = settings.appIcon || '';

    var splashLogo = document.querySelector('.splash-logo');
    if (splashLogo && splashUrl) {
        var img = document.createElement('img');
        img.alt = 'شعار';
        img.className = 'splash-circle-img';
        img.onerror = function () {
            splashLogo.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        };
        splashLogo.innerHTML = '';
        splashLogo.appendChild(img);
        img.src = splashUrl;
        // ملحوظة: شاشة الترحيب تختفي بمؤقّت مستقل مدته 3 ثوانٍ بالضبط (بالأعلى)، وليس بمجرد تحميل الصورة
    }

    document.querySelectorAll('.logo-icon').forEach(function (el) {
        if (!logoUrl) return;
        var logoImg = document.createElement('img');
        logoImg.src = logoUrl;
        logoImg.alt = 'Logo';
        logoImg.className = 'header-logo-img';
        logoImg.onerror = function () {
            el.innerHTML = '<i class="fas fa-graduation-cap"></i>';
        };
        el.innerHTML = '';
        el.appendChild(logoImg);
        el.classList.add('has-image');
    });

    if (logoUrl) {
        document.querySelectorAll('#authButtons, #userMenu').forEach(function (box) {
            if (!box || box.querySelector('.header-side-logo')) return;
            var side = document.createElement('img');
            side.src = logoUrl;
            side.alt = 'Logo';
            side.className = 'header-side-logo';
            box.insertBefore(side, box.firstChild);
        });
    }

    // صورة الموقع: تُستخدم كأيقونة تبويب المتصفح (favicon) وكصورة معاينة عند مشاركة الرابط
    if (siteImageUrl) {
        document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach(function (el) { el.href = siteImageUrl; });
        var favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.href = siteImageUrl;
            document.head.appendChild(favicon);
        }
        var ogImage = document.querySelector('meta[property="og:image"]');
        if (!ogImage) {
            ogImage = document.createElement('meta');
            ogImage.setAttribute('property', 'og:image');
            document.head.appendChild(ogImage);
        }
        ogImage.setAttribute('content', siteImageUrl);
    }

    // أيقونة البرنامج: تظهر عند إضافة الموقع كتطبيق على الشاشة الرئيسية بالجوال (خصوصاً آيفون)
    if (appIconUrl) {
        var appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
        if (!appleIcon) {
            appleIcon = document.createElement('link');
            appleIcon.rel = 'apple-touch-icon';
            document.head.appendChild(appleIcon);
        }
        appleIcon.href = appIconUrl;
    }
}

function getSectionImage(sectionId) {
    const settings = (typeof getSettings === 'function') ? getSettings() : {};
    const map = settings.sectionImages || SITE_BRANDING.sectionImages || {};
    return map[sectionId] || map[String(sectionId)] || '';
}

// ========== تفعيلات عامة تعمل في كل صفحات الموقع ==========
document.addEventListener('DOMContentLoaded', function () {
    // تطبيق صور الهوية البصرية (اللوجو / شاشة الترحيب / صورة الموقع / أيقونة البرنامج) فور فتح أي صفحة
    if (typeof applyBrandingImages === 'function') applyBrandingImages();

    // تفعيل المزامنة اللحظية: أي حفظ من الأدمن يظهر فوراً للجميع
    if (typeof initSiteSettingsSync === 'function') initSiteSettingsSync();

    // ===== القائمة الجانبية (Drawer) — تفتح من اليمين وفيها كل روابط الموقع =====
    var menuBtn = document.getElementById('mobileMenuBtn');
    var navLinks = document.getElementById('navLinks');
    if (menuBtn && navLinks) {
        var overlay = document.createElement('div');
        overlay.className = 'nav-overlay';
        document.body.appendChild(overlay);

        // رأس القائمة (اللوجو + زر الإغلاق) — يظهر فقط داخل الدرج
        var head = document.createElement('div');
        head.className = 'nav-drawer-head';
        head.innerHTML = '<span class="nav-drawer-title"><i class="fas fa-spa"></i> <span dir="ltr" style="unicode-bidi:isolate;">Maana Therapy</span></span>' +
                         '<button type="button" class="nav-drawer-close" aria-label="إغلاق القائمة"><i class="fas fa-xmark"></i></button>';
        navLinks.insertBefore(head, navLinks.firstChild);

        function setNav(open) {
            navLinks.classList.toggle('open', open);
            overlay.classList.toggle('show', open);
            document.body.classList.toggle('nav-open', open);
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        menuBtn.setAttribute('aria-controls', 'navLinks');
        menuBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            setNav(!navLinks.classList.contains('open'));
        });
        overlay.addEventListener('click', function () { setNav(false); });
        head.querySelector('.nav-drawer-close').addEventListener('click', function () { setNav(false); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
        // اقفل القائمة تلقائياً عند الضغط على أي رابط بداخلها
        navLinks.querySelectorAll('a').forEach(function (el) {
            el.addEventListener('click', function () { setNav(false); });
        });
    }
});


// ========== دوال مشتركة (Firebase) كانت ناقصة ==========

// المستخدمون من Firestore → كائن { uid: profile } (للأدمن فقط حسب القواعد)
async function getUsersAsync() {
    const snap = await db.collection('users').get();
    const out = {};
    snap.forEach(function (d) {
        out[d.id] = (typeof _profileFromDoc === 'function')
            ? _profileFromDoc(d.id, d.data())
            : Object.assign({ id: d.id }, d.data());
    });
    return out;
}

// تحديث مستخدم (الأدمن فقط حسب firestore.rules)
async function updateUserDoc(uid, fields) {
    await db.collection('users').doc(uid).update(fields);
}

// المحاضرات من Firestore → كائن { id: lecture } (البيانات العامة فقط، بدون رابط الفيديو)
async function getLecturesAsync() {
    const snap = await db.collection('lectures').get();
    const out = {};
    snap.forEach(function (d) {
        out[d.id] = Object.assign({ id: d.id }, d.data());
    });
    return out;
}

// تحديث الهيدر: يخفي أزرار الدخول ويظهر قائمة المستخدم
function updateHeaderAuth() {
    var user = getCurrentUser();
    document.querySelectorAll('#authButtons').forEach(function (el) {
        el.style.display = user ? 'none' : 'flex';
    });
    document.querySelectorAll('#userMenu').forEach(function (el) {
        el.style.display = user ? 'flex' : 'none';
    });
    document.querySelectorAll('#headerQuickLogin').forEach(function (el) {
        el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('.user-name').forEach(function (el) {
        el.textContent = user ? ((user.name || '').split(' ')[0] || 'حسابي') : '';
    });
    document.querySelectorAll('#adminNavLink').forEach(function (el) {
        el.style.display = (user && user.isAdmin) ? 'inline-flex' : 'none';
    });
}

// الخروج
async function logout() {
    try { await auth.signOut(); } catch (e) { console.error(e); }
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// حدّث الهيدر فور تحميل الصفحة (من الكاش) وعند تأكد Firebase من حالة الدخول
document.addEventListener('DOMContentLoaded', updateHeaderAuth);
document.addEventListener('authReady', updateHeaderAuth);

// ========== بيانات الأقسام (الأقسام القديمة ال13 محذوفة) ==========
const sectionsData = [
    // ملاحظة: الأقسام ال13 القديمة تم حذفها بالكامل — يمكن إضافة أقسام جديدة هنا لاحقاً
    {
        id: 14,
        title: "باقة المحاضرات الأونلاين",
        desc: "ثلاث مسارات محاضرات — كل مسار يضم 10 محاضرات بالشراء أو كود أو موافقة الإدارة",
        icon: "fa-video",
        free: true,
        isLecturesPackage: true,
        subs: [
            { id: "14-1", title: "مسار الإدارة والقيادة", desc: "10 محاضرات متخصصة في الإدارة والقيادة" },
            { id: "14-2", title: "مسار تطوير المهارات المهنية", desc: "10 محاضرات في بناء المهارات والأهداف" },
            { id: "14-3", title: "مسار الاستشارات العلمية", desc: "10 محاضرات في الاستشارات والتواصل المهني" }
        ]
    },
    {
        id: 15,
        title: "تنمية المهارات",
        desc: "تعديل السلوك • التخاطب • 10 ألعاب تعليمية احترافية",
        icon: "fa-brain",
        free: true,
        theme: "#00b4d8",
        gradient: "linear-gradient(135deg,#00b4d8,#0077b6)",
        subs: [
            { id: "15-1", title: "تعديل السلوك", desc: "مبادئ وأساليب علمية لتعديل السلوك" },
            { id: "15-2", title: "التخاطب والنطق", desc: "أساسيات اضطرابات النطق وتمارين داعمة" },
            { id: "15-3", title: "الألعاب التعليمية", desc: "10 ألعاب لتنمية الذاكرة والانتباه واللغة" }
        ]
    }
];


/* ============================================================
   دوال مشتركة مطلوبة للوحة الإدارة (كانت غير معرّفة → كانت تكسر الحفظ/الحذف)
   ============================================================ */

// كود عشوائي بالبادئة: LEC-7K3P9Q
function generateCode(prefix) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 6; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return (prefix ? prefix + '-' : '') + out;
}

// حفظ بيانات المحاضرة العامة + (اختياري) رابط الفيديو في مستند منفصل secureContent/video
async function saveLectureDoc(id, metadata, videoUrl) {
    var clean = {};
    Object.keys(metadata || {}).forEach(function (k) { if (metadata[k] !== undefined) clean[k] = metadata[k]; });
    var ref = db.collection('lectures').doc(id);
    await ref.set(clean, { merge: true });
    if (typeof videoUrl === 'string') {
        await ref.collection('secureContent').doc('video').set({ url: videoUrl });
    }
}

async function getLectureVideoUrl(id) {
    try {
        var d = await db.collection('lectures').doc(id).collection('secureContent').doc('video').get();
        return d.exists ? (d.data().url || '') : '';
    } catch (e) {
        console.warn('تعذّر قراءة رابط المحاضرة', e);
        return '';
    }
}

async function deleteLectureDoc(id) {
    var ref = db.collection('lectures').doc(id);
    try { await ref.collection('secureContent').doc('video').delete(); } catch (e) {}
    await ref.delete();
}

// طرق الدفع (تُخزَّن مع إعدادات الموقع فتصل فورًا لصفحات الدفع)
function getPaymentMethods() {
    var s = getSettings();
    return Array.isArray(s.paymentMethods) ? s.paymentMethods.slice() : [];
}
function savePaymentMethods(list) {
    saveSettings({ paymentMethods: list });
}


/* ============================================================
   الوصول للمحاضرات بدون Cloud Functions (الحماية في firestore.rules)
   - طلب المشاهدة: مستند accessRequests/{uid}_{lectureId} بحالة pending
   - الأدمن يوافق من لوحة التحكم → status = approved
   - رابط الفيديو في lectures/{id}/secureContent/video ولا يُقرأ إلا بعد الموافقة
   ============================================================ */
async function requestLectureAccessClient(lec) {
    const u = auth.currentUser;
    if (!u) return { success: false, error: 'سجّل الدخول أولاً' };
    const ref = db.collection('accessRequests').doc(u.uid + '_' + lec.id);
    const snap = await ref.get();
    if (snap.exists) return { success: true, status: snap.data().status || 'pending', isNew: false };
    const prof = (typeof getCurrentUser === 'function' && getCurrentUser()) || {};
    await ref.set({
        userId: u.uid,
        userName: prof.name || u.displayName || '',
        userEmail: u.email || '',
        lectureId: lec.id,
        lectureTitle: lec.title || '',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, status: 'pending', isNew: true };
}

/** يرجّع { success, title, url } لو المستخدم معه موافقة (أو أدمن) */
async function getApprovedLectureClient(lectureId) {
    try {
        const lecDoc = await db.collection('lectures').doc(lectureId).get();
        if (!lecDoc.exists || lecDoc.data().active === false) return { success: false, error: 'المحاضرة غير متاحة' };
        const lec = lecDoc.data();
        let url = lec.mediaUrl || '';
        if (!url) {
            const v = await db.collection('lectures').doc(lectureId).collection('secureContent').doc('video').get();
            url = v.exists ? (v.data().url || '') : '';
        }
        if (!url) return { success: false, error: 'لم يتم إضافة رابط هذه المحاضرة بعد من الإدارة' };
        return { success: true, title: lec.title, url: url };
    } catch (e) {
        return { success: false, error: 'المحاضرة تحتاج موافقة الإدارة — اطلب المشاهدة أولاً', denied: true };
    }
}

/** الدخول بكود المحاضرة: الكود = معرّف المحاضرة، والرابط لا يظهر إلا لمن وافقت له الإدارة */
async function verifyLectureAccess(code, name, lectureId) {
    const id = String(lectureId || code || '').trim();
    const tryIds = [id, id.toUpperCase()];
    for (const t of tryIds) {
        const doc = await db.collection('lectures').doc(t).get();
        if (doc.exists) {
            if (lectureId && String(code).trim().toUpperCase() !== String(lectureId).toUpperCase()) {
                return { success: false, error: 'الكود غير صحيح' };
            }
            return getApprovedLectureClient(t);
        }
    }
    return { success: false, error: 'الكود غير صحيح' };
}
