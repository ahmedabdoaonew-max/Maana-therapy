/* ============================================================
   بوسترات التواصل (كروت الأخصائيين / العروض) — تظهر في الرئيسية قبل الأسئلة الشائعة
   كل كارت: صورة + اسم + تخصص + خبرة + تصنيفات + سعر + مدة + زر واتساب برسالة جاهزة
   يُدار بالكامل من لوحة التحكم (إضافة / تعديل / حذف / ترتيب / إخفاء)
   الرسالة الجاهزة تدعم المتغيرات: {name} {role} {price} {duration}
   ============================================================ */

var PST_DEFAULT_MSG = 'السلام عليكم، أرغب في حجز جلسة مع {name} ({role}).\nسعر الجلسة: {price} — مدة الجلسة: {duration}.\nبرجاء تأكيد أقرب موعد متاح.';

/* عينات للمعاينة فقط (أسماء وأرقام تجريبية — عدّلها أو امسحها من لوحة التحكم) */
var PST_SAMPLES = [
    { name: 'د. اسم الأخصائي (مثال 1)', role: 'أخصائي الطب النفسي', badge: 'أخصائي الطب النفسي', experience: '+8 سنوات الخبرة', tags: '', price: '920 EGP', duration: '30 دقيقة', photo: '', whatsapp: '', message: '', buttonText: 'حجز جلسة', order: 1, active: true },
    { name: 'أ. اسم الأخصائية (مثال 2)', role: 'أخصائية نفسية', badge: 'أخصائية نفسية', experience: '+5 سنوات الخبرة', tags: 'العلاج الفردي', price: '250 EGP', duration: '30 دقيقة', photo: '', whatsapp: '', message: '', buttonText: 'حجز جلسة', order: 2, active: true },
    { name: 'أ. اسم المرشد (مثال 3)', role: 'مرشد أسري وتربوي', badge: 'إرشاد أسري', experience: '+6 سنوات الخبرة', tags: 'العلاقات الأسرية، الاستشارات', price: '300 EGP', duration: '45 دقيقة', photo: '', whatsapp: '', message: '', buttonText: 'احجز استشارة', order: 3, active: true }
];

function pstEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
}
function pstWA(p) { return String(p.whatsapp || '').replace(/[^0-9]/g, '') || (window.SITE_CONTACT && SITE_CONTACT.whatsapp) || '201152013172'; }
function pstTags(p) { return String(p.tags || '').split(/[,،\n]/).map(function (t) { return t.trim(); }).filter(Boolean); }
function pstMessage(p) {
    var tpl = (p.message && p.message.trim()) ? p.message : PST_DEFAULT_MSG;
    var msg = tpl.replace(/\{name\}/g, p.name || '').replace(/\{role\}/g, p.role || p.badge || '')
        .replace(/\{price\}/g, p.price || '').replace(/\{duration\}/g, p.duration || '');
    try {
        var u = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
        if (u && u.name) msg += '\nالاسم: ' + u.name + (u.phone ? '\nالهاتف: ' + u.phone : '');
    } catch (e) {}
    return msg;
}

/* ================= الواجهة العامة (index.html) ================= */
function pstCardHtml(p) {
    var tags = pstTags(p).map(function (t) { return '<span class="pst-tag">' + pstEsc(t) + '</span>'; }).join('');
    var href = 'https://wa.me/' + pstWA(p) + '?text=' + encodeURIComponent(pstMessage(p));
    return '<article class="pst-card">' +
        '<div class="pst-photo">' +
            (p.photo ? '<img src="' + pstEsc(p.photo) + '" alt="' + pstEsc(p.name) + '" loading="lazy" decoding="async">' : '<i class="fas fa-user-doctor pst-ph"></i>') +
            (p.badge ? '<span class="pst-badge">' + pstEsc(p.badge) + '</span>' : '') +
        '</div>' +
        '<div class="pst-body">' +
            '<h3 class="pst-name">' + pstEsc(p.name) + '</h3>' +
            (p.role ? '<div class="pst-role"><i class="fas fa-user-doctor"></i> ' + pstEsc(p.role) + '</div>' : '') +
            (p.experience ? '<div class="pst-exp"><i class="fas fa-briefcase"></i> ' + pstEsc(p.experience) + '</div>' : '') +
            (tags ? '<div class="pst-tags">' + tags + '</div>' : '') +
            ((p.price || p.duration) ? '<div class="pst-price"><span class="pst-price-l">سعر الجلسة</span><span class="pst-price-v">' + pstEsc(p.price) + (p.duration ? ' <small>/ ' + pstEsc(p.duration) + '</small>' : '') + '</span></div>' : '') +
            '<a class="pst-cta" href="' + href + '" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> ' + pstEsc(p.buttonText || 'حجز جلسة') + '</a>' +
        '</div>' +
    '</article>';
}

async function pstInitPublic() {
    var sec = document.getElementById('postersSection');
    var grid = document.getElementById('postersGrid');
    if (!sec || !grid) return;
    var list = [];
    try {
        var res = await Promise.all([
            db.collection('contactPosters').get(),
            db.collection('settings').doc('posters').get()
        ]);
        list = res[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        var seeded = res[1].exists && res[1].data().seeded === true;
        if (!list.length && !seeded) list = PST_SAMPLES.slice();   // قبل ما الأدمن يفتح القسم أول مرة: اعرض العينات
        var t = res[1].exists ? res[1].data() : {};
        if (t.title) { var h = document.getElementById('pstTitle'); if (h) h.textContent = t.title; }
        if (t.subtitle) { var s = document.getElementById('pstSub'); if (s) s.textContent = t.subtitle; }
    } catch (e) {
        console.error(e);
        return; // لو فشل التحميل نسيب القسم مخفي
    }
    list = list.filter(function (p) { return p.active !== false; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (!list.length) { sec.style.display = 'none'; return; }
    grid.innerHTML = list.map(pstCardHtml).join('');
    sec.style.display = '';
}
document.addEventListener('DOMContentLoaded', function () { if (document.getElementById('postersGrid')) pstInitPublic(); });

/* ================= لوحة الإدارة (admin.html) ================= */
var pstAdmin = { list: [], settings: {} };

async function renderAdminPosters() {
    var wrap = document.getElementById('postersAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        var res = await Promise.all([db.collection('contactPosters').get(), db.collection('settings').doc('posters').get()]);
        pstAdmin.list = res[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        pstAdmin.settings = res[1].exists ? res[1].data() : {};
        // أول مرة: نكتب العينات الثلاث في قاعدة البيانات عشان تبقى قابلة للتعديل والحذف
        if (!pstAdmin.list.length && pstAdmin.settings.seeded !== true) {
            var batch = db.batch();
            PST_SAMPLES.forEach(function (s) {
                var ref = db.collection('contactPosters').doc();
                batch.set(ref, Object.assign({}, s, { whatsapp: (window.SITE_CONTACT && SITE_CONTACT.whatsapp) || '201152013172' }));
            });
            batch.set(db.collection('settings').doc('posters'), { seeded: true }, { merge: true });
            await batch.commit();
            pstAdmin.settings.seeded = true;
            res = await db.collection('contactPosters').get();
            pstAdmin.list = res.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        }
        pstAdmin.list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<div class="admin-load-error">' + (typeof adminErrorText === 'function' ? adminErrorText(e) : 'تعذّر تحميل البيانات') + '</div>';
        return;
    }
    pstRenderAdmin();
}

function pstField(label, inner, full) {
    return '<div class="form-group"' + (full ? ' style="grid-column:1/-1;"' : '') + '><label>' + label + '</label>' + inner + '</div>';
}
function pstFormFields(p) {
    p = p || {};
    var v = function (k) { return pstEsc(p[k] || ''); };
    return '' +
        pstField('الاسم', '<input name="name" value="' + v('name') + '" required>') +
        pstField('التخصص (تحت الاسم)', '<input name="role" value="' + v('role') + '" placeholder="مثال: أخصائي الطب النفسي">') +
        pstField('الشارة على الصورة', '<input name="badge" value="' + v('badge') + '" placeholder="مثال: أخصائي نفسي">') +
        pstField('الخبرة', '<input name="experience" value="' + v('experience') + '" placeholder="+8 سنوات الخبرة">') +
        pstField('التصنيفات (افصل بينها بفاصلة)', '<input name="tags" value="' + v('tags') + '" placeholder="العلاج الفردي، القلق">', true) +
        pstField('السعر', '<input name="price" value="' + v('price') + '" placeholder="250 EGP">') +
        pstField('مدة الجلسة', '<input name="duration" value="' + v('duration') + '" placeholder="30 دقيقة">') +
        pstField('رقم واتساب التواصل (بصيغة دولية بدون +)', '<input name="whatsapp" value="' + v('whatsapp') + '" dir="ltr" placeholder="201152013172">') +
        pstField('نص الزر', '<input name="buttonText" value="' + pstEsc(p.buttonText || 'حجز جلسة') + '">') +
        pstField('صورة الكارت — من الجهاز', '<input type="file" name="photoFile" accept="image/*"><small style="color:var(--admin-text-muted);">' + (p.photo ? 'يوجد صورة محفوظة — اختر ملفاً جديداً لاستبدالها' : '') + '</small><input type="hidden" name="photo" value="' + v('photo') + '">') +
        pstField('الترتيب', '<input type="number" name="order" value="' + (p.order || 0) + '">') +
        pstField('الرسالة الجاهزة على واتساب — المتغيرات: {name} {role} {price} {duration} (سيب الخانة فاضية للرسالة الافتراضية)', '<textarea name="message" rows="4" placeholder="' + pstEsc(PST_DEFAULT_MSG) + '">' + pstEsc(p.message || '') + '</textarea>', true) +
        '<div class="form-group" style="grid-column:1/-1;"><label style="display:flex;gap:8px;align-items:center;cursor:pointer;"><input type="checkbox" name="active"' + (p.active === false ? '' : ' checked') + '> ظاهر في الصفحة الرئيسية</label></div>' +
        '<div class="pstProgress" style="grid-column:1/-1;display:none;color:var(--admin-text);"></div>';
}

function pstRenderAdmin() {
    var wrap = document.getElementById('postersAdminWrap');
    if (!wrap) return;
    var panel = 'background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;';
    var grid = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';
    var items = pstAdmin.list.map(function (p) {
        return '<details style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;">' +
            '<summary style="padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;align-items:center;gap:10px;">' +
                '<span>' + pstEsc(p.name || '(بدون اسم)') + (p.active === false ? ' <span style="color:#e05656;font-size:.8rem;">(مخفي)</span>' : '') + '</span>' +
                '<button type="button" class="btn-outline" style="padding:4px 8px;color:#e05656;" onclick="event.preventDefault();pstDelete(\'' + p.id + '\')"><i class="fas fa-trash"></i></button>' +
            '</summary>' +
            '<form onsubmit="pstSave(event,\'' + p.id + '\')" style="padding:0 16px 16px;' + grid + '">' + pstFormFields(p) +
                '<div style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ التعديلات</button></div>' +
            '</form></details>';
    }).join('');

    wrap.innerHTML =
        '<div style="' + panel + '"><h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">عنوان القسم في الرئيسية</h3>' +
            '<form onsubmit="pstSaveTitles(event)" style="' + grid + '">' +
                pstField('العنوان', '<input name="title" value="' + pstEsc(pstAdmin.settings.title || 'احجز جلستك مع أخصائيينا') + '">') +
                pstField('وصف قصير', '<input name="subtitle" value="' + pstEsc(pstAdmin.settings.subtitle || 'اختر الأخصائي المناسب وتواصل معنا مباشرة على واتساب') + '">') +
                '<div style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ العنوان</button></div>' +
            '</form></div>' +
        '<div style="' + panel + '"><h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">إضافة بوستر جديد</h3>' +
            '<form onsubmit="pstAdd(event)" style="' + grid + '">' + pstFormFields({ order: pstAdmin.list.length + 1 }) +
                '<div style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;"><i class="fas fa-plus"></i> إضافة البوستر</button></div>' +
            '</form></div>' +
        '<h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">البوسترات الحالية (' + pstAdmin.list.length + ')</h3>' +
        (items || '<p style="color:var(--admin-text-muted);">لا توجد بوسترات.</p>');
}

async function pstReadForm(f, ui) {
    var photo = (f.photo.value || '').trim();
    if (f.photoFile.files[0]) {
        ui.set(0.2, 'جاري رفع الصورة');
        var img = await mnPrepareImage(f.photoFile.files[0], 1000, 0.88);
        photo = (await mnUploadFile(img, 'posters/photos', function (p) { ui.set(p, 'جاري رفع الصورة'); })).url;
    }
    return {
        name: f.name.value.trim(), role: f.role.value.trim(), badge: f.badge.value.trim(), experience: f.experience.value.trim(),
        tags: f.tags.value.trim(), price: f.price.value.trim(), duration: f.duration.value.trim(),
        whatsapp: f.whatsapp.value.replace(/[^0-9]/g, ''), buttonText: f.buttonText.value.trim() || 'حجز جلسة',
        photo: photo, order: Number(f.order.value) || 0, message: f.message.value.trim(), active: !!f.active.checked
    };
}
async function pstAdd(ev) {
    ev.preventDefault();
    var f = ev.target, btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    var ui = mnProgressUI(f.querySelector('.pstProgress'));
    try {
        var data = await pstReadForm(f, ui);
        await db.collection('contactPosters').add(data);
        await db.collection('settings').doc('posters').set({ seeded: true }, { merge: true });
        showToast('تمت إضافة البوستر');
        renderAdminPosters();
    } catch (e) { console.error(e); showToast('فشل الحفظ: ' + (e.message || e.code), 'error'); btn.disabled = false; }
}
async function pstSave(ev, id) {
    ev.preventDefault();
    var f = ev.target, btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    var ui = mnProgressUI(f.querySelector('.pstProgress'));
    try {
        var data = await pstReadForm(f, ui);
        await db.collection('contactPosters').doc(id).set(data, { merge: true });
        showToast('تم حفظ البوستر');
        renderAdminPosters();
    } catch (e) { console.error(e); showToast('فشل الحفظ: ' + (e.message || e.code), 'error'); btn.disabled = false; }
}
async function pstDelete(id) {
    if (!confirm('حذف هذا البوستر؟')) return;
    try {
        await db.collection('contactPosters').doc(id).delete();
        await db.collection('settings').doc('posters').set({ seeded: true }, { merge: true });
        showToast('تم الحذف');
        renderAdminPosters();
    } catch (e) { console.error(e); showToast('تعذّر الحذف', 'error'); }
}
async function pstSaveTitles(ev) {
    ev.preventDefault();
    var f = ev.target;
    try {
        await db.collection('settings').doc('posters').set({ title: f.title.value.trim(), subtitle: f.subtitle.value.trim(), seeded: true }, { merge: true });
        showToast('تم حفظ العنوان');
    } catch (e) { console.error(e); showToast('فشل الحفظ', 'error'); }
}
