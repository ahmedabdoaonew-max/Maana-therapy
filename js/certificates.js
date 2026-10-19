/* ============================================
   الشهادات السرية — صورة متدرب + صورة شهادة + تحميل
   ============================================ */

// ========== تخزين ومزامنة الشهادات ==========
// نفس فكرة إعدادات الموقع (app.js): كاش محلي فوري + Firestore كمصدر مشترك
// حتى أي شهادة يضيفها/يعدّلها/يحذفها الأدمن تظهر لكل زوار الموقع فوراً،
// مش بس على جهاز الأدمن. لازم أولاً وضع بيانات مشروع Firebase الحقيقية في
// js/firebase-config.js (حالياً فيها قيم placeholder) عشان المشاركة الفعلية تشتغل.
let __certificatesCache = {};
try {
    var __savedCerts = JSON.parse(localStorage.getItem('academyCertificatesCache') || '{}');
    __certificatesCache = Object.assign({}, (typeof CERTIFICATES_SEED !== 'undefined' ? CERTIFICATES_SEED : {}), __savedCerts);
} catch (e) {
    __certificatesCache = (typeof CERTIFICATES_SEED !== 'undefined' ? CERTIFICATES_SEED : {});
}

function __persistCertificatesCache() {
    try { localStorage.setItem('academyCertificatesCache', JSON.stringify(__certificatesCache)); } catch (e) {}
}

// إرجاع نسخة من الشهادات الحالية (متاحة فوراً من الكاش المحلي بدون انتظار الشبكة)
function getCertificates() {
    return __certificatesCache || {};
}

// حفظ كل الشهادات (تُستخدم من لوحة التحكم عند إضافة/تعديل شهادة) —
// تُحدَّث فوراً محلياً، وتُكتب أيضاً في Firestore حتى تنتشر لكل زوار الموقع الآن
function saveCertificates(newCerts) {
    __certificatesCache = Object.assign({}, newCerts);
    __persistCertificatesCache();
    if (typeof db !== 'undefined' && db) {
        Object.keys(newCerts).forEach(function (id) {
            db.collection('certificates').doc(id).set(newCerts[id], { merge: true }).catch(function (err) {
                console.error('تعذر حفظ الشهادة في Firestore:', err);
            });
        });
    }
}

// حذف شهادة واحدة محلياً ومن Firestore (تُستخدم من زر "حذف" في لوحة التحكم)
function deleteCertificateById(id) {
    delete __certificatesCache[id];
    __persistCertificatesCache();
    if (typeof db !== 'undefined' && db) {
        db.collection('certificates').doc(id).delete().catch(function (err) {
            console.error('تعذر حذف الشهادة من Firestore:', err);
        });
    }
}

// تحميل كل الشهادات المخزّنة في Firestore مرة واحدة عند فتح أي صفحة،
// حتى يشوف كل زائر آخر تحديث عمله الأدمن (مش بس جهاز الأدمن نفسه)
function __loadCertificatesFromFirestore() {
    if (typeof db === 'undefined' || !db) return;
    db.collection('certificates').get().then(function (snap) {
        snap.forEach(function (doc) { __certificatesCache[doc.id] = doc.data(); });
        __persistCertificatesCache();
        if (typeof renderAdminCertificates === 'function' && document.getElementById('certsTableBody')) {
            renderAdminCertificates();
        }
    }).catch(function (err) {
        console.warn('تعذر تحميل الشهادات من Firestore:', err);
    });
}

// مزامنة لحظية: أي إضافة/تعديل/حذف شهادة يعمله الأدمن يظهر فوراً لكل من
// يكون فاتح الموقع في نفس اللحظة (نفس أسلوب initSiteSettingsSync في app.js)
function initCertificatesSync() {
    if (typeof db === 'undefined' || !db) return;
    db.collection('certificates').onSnapshot(function (snap) {
        snap.docChanges().forEach(function (change) {
            if (change.type === 'removed') {
                delete __certificatesCache[change.doc.id];
            } else {
                __certificatesCache[change.doc.id] = change.doc.data();
            }
        });
        __persistCertificatesCache();
        if (typeof renderAdminCertificates === 'function' && document.getElementById('certsTableBody')) {
            renderAdminCertificates();
        }
    }, function (err) {
        console.warn('تعذرت مزامنة الشهادات:', err);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    __loadCertificatesFromFirestore();
    initCertificatesSync();
});

function verifyCertificate(event) {
    if (event) event.preventDefault();
    var input = document.getElementById('certCodeInput')
        || document.getElementById('verifyCode')
        || document.getElementById('secretCertCode');
    if (!input) return;
    var code = input.value.trim().toUpperCase();
    if (!code) { showToast('أدخل كود الشهادة السري', 'error'); return; }

    var certs = getCertificates();
    var cert = certs[code];
    if (!cert) {
        cert = Object.values(certs).find(function (c) {
            return (c.id || c.code || c.secretId || '').toUpperCase() === code;
        });
    }

    var resultArea = document.getElementById('verifyResult') || document.getElementById('secretCertResult');
    if (!cert) {
        if (resultArea) {
            resultArea.innerHTML = '<div class="cert-fail-box"><i class="fas fa-lock"></i><h3>غير مصرح</h3><p>الكود غير صحيح. الشهادة سرية ولا تُعرض إلا بالكود الخاص.</p></div>';
        }
        showToast('كود الشهادة غير صحيح', 'error');
        return;
    }

    sessionStorage.setItem('viewCertificate', JSON.stringify(cert));
    if (resultArea) {
        resultArea.innerHTML = buildSecretCertPage(cert);
        showToast('تم فتح الشهادة', 'success');
    } else {
        window.location.href = 'certificate.html?id=' + encodeURIComponent(cert.id || cert.secretId || cert.code);
    }
}

function buildSecretCertPage(cert) {
    var name = cert.name || '';
    var course = cert.courseName || '';
    var grant = cert.grantName || course;
    var year = cert.graduationYear || (cert.date || '').slice(0, 4) || '';
    var grade = cert.grade || '—';
    var doctor = cert.doctorName || 'Maana Therapy';
    var secretId = cert.secretId || cert.id || cert.code || '';
    var photo = cert.photoUrl || '';
    var certImg = cert.certificateImageUrl || '';
    var date = cert.date || '';
    var duration = cert.duration || '';
    var certNumber = cert.certificateNumber || secretId;
    var email = cert.email || '';
    var phone = cert.phone || '';

    var photoHtml = photo
        ? '<img src="' + photo + '" alt="المتدرب" class="cert-trainee-photo" onerror="this.style.display=\'none\'">'
        : '<div class="cert-trainee-photo" style="display:flex;align-items:center;justify-content:center;background:#e8f5e9;color:#2E7D32;font-size:40px;"><i class="fas fa-user"></i></div>';

    var imgHtml = certImg
        ? '<div class="cert-image-wrap"><img id="certDownloadImg" src="' + certImg + '" alt="الشهادة"></div>'
        : '<div class="elegant-cert-inner" style="margin:16px 0;"><h3 style="color:#1B5E20;">' + course + '</h3><p>' + name + '</p></div>';

    var extraRows = '';
    if (duration) extraRows += '<div class="row"><span class="label"><i class="fas fa-clock"></i> مدة البرنامج</span><span class="value">' + duration + '</span></div>';
    if (email) extraRows += '<div class="row"><span class="label"><i class="fas fa-envelope"></i> البريد الإلكتروني</span><span class="value">' + email + '</span></div>';
    if (phone) extraRows += '<div class="row"><span class="label"><i class="fas fa-phone"></i> رقم الهاتف</span><span class="value">' + phone + '</span></div>';

    return (
        '<div class="cert-result-page fade-in">' +
        photoHtml +
        '<h2 style="text-align:center;color:var(--primary-dark);margin:0 0 4px;">' + name + '</h2>' +
        '<div class="cert-badge-row">' +
        '<span class="cert-chip">🏆 ' + grade + '</span>' +
        '<span class="cert-chip green"><i class="fas fa-graduation-cap"></i> ' + year + '</span>' +
        '<span class="cert-chip blue"><i class="fas fa-hashtag"></i> ' + certNumber + '</span>' +
        '</div>' +
        '<p style="text-align:center;color:#888;font-size:0.85rem;margin-bottom:16px;"><i class="fas fa-lock"></i> ID سري: ' + secretId + '</p>' +
        imgHtml +
        '<div class="cert-details-box">' +
        '<div class="row"><span class="label"><i class="fas fa-book"></i> اسم المنحة / الدورة</span><span class="value">' + grant + '</span></div>' +
        '<div class="row"><span class="label"><i class="fas fa-star"></i> الدرجة</span><span class="value">' + grade + '</span></div>' +
        '<div class="row"><span class="label"><i class="fas fa-user-doctor"></i> إشراف</span><span class="value">' + doctor + '</span></div>' +
        '<div class="row"><span class="label"><i class="fas fa-calendar"></i> تاريخ الإصدار</span><span class="value">' + date + '</span></div>' +
        extraRows +
        '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">' +
        (certImg ? '<a class="btn-primary" id="btnDownloadCert" href="' + certImg + '" download="certificate-' + secretId + '.jpg" target="_blank" style="padding:12px 24px;border-radius:30px;display:inline-flex;align-items:center;gap:8px;"><i class="fas fa-download"></i> تحميل الشهادة</a>' : '') +
        '<button type="button" class="btn-outline" onclick="window.print()" style="padding:12px 24px;border-radius:30px;cursor:pointer;"><i class="fas fa-print"></i> طباعة</button>' +
        '</div></div>'
    );
}

function loadSingleCertificate() {
    var container = document.getElementById('singleCert');
    if (!container) return;
    var params = new URLSearchParams(window.location.search);
    var id = (params.get('id') || '').toUpperCase();
    var cert = null;
    try {
        var s = sessionStorage.getItem('viewCertificate');
        if (s) cert = JSON.parse(s);
    } catch (e) {}

    if (cert && id && (cert.id || cert.secretId || cert.code || '').toUpperCase() !== id) cert = null;

    if (!cert) {
        container.innerHTML =
            '<div class="auth-card" style="max-width:420px;margin:40px auto;text-align:center;">' +
            '<div style="font-size:40px;color:var(--primary-blue);margin-bottom:8px;"><i class="fas fa-lock"></i></div>' +
            '<h2 style="color:var(--primary-dark);">عرض سري للشهادة</h2>' +
            '<p style="color:#666;margin-bottom:16px;">أدخل الكود السري الخاص بالشهادة</p>' +
            '<form onsubmit="verifyCertificate(event)">' +
            '<div class="form-group"><input type="text" id="secretCertCode" value="' + id + '" placeholder="الكود السري" required style="text-transform:uppercase;"></div>' +
            '<button type="submit" class="form-submit">عرض الشهادة</button></form>' +
            '<div id="secretCertResult" style="margin-top:24px;"></div></div>';
        return;
    }
    container.innerHTML = buildSecretCertPage(cert);
}

function renderCertificatesList(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
        '<div class="auth-card" style="max-width:480px;margin:0 auto;grid-column:1/-1;">' +
        '<div style="text-align:center;font-size:40px;color:var(--primary-blue);"><i class="fas fa-lock"></i></div>' +
        '<h2 style="text-align:center;color:var(--primary-dark);">التحقق السري</h2>' +
        '<p style="text-align:center;color:#666;margin-bottom:20px;">لا تظهر الشهادات للعامة — أدخل الكود السري فقط</p>' +
        '<form onsubmit="verifyCertificate(event)">' +
        '<div class="form-group"><label>الكود السري للشهادة</label>' +
        '<input type="text" id="certCodeInput" placeholder="CERT-XXXX" required style="text-transform:uppercase;"></div>' +
        '<button type="submit" class="form-submit">عرض الشهادة</button></form>' +
        '<div id="verifyResult" style="margin-top:28px;"></div></div>';
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('certificatesList')) renderCertificatesList();
    if (document.getElementById('singleCert')) loadSingleCertificate();
});
