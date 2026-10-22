/* ============================================================
   الأخصائيون والمعالجون — مصدر واحد يظهر في الرئيسية وفي صفحة "جلستك النفسية"
   - الأساسيون: js/specialists.js — وبعدهم اللي بتضيفه من لوحة التحكم بالترتيب
   - يُدار من لوحة التحكم (قسم "الأخصائيون والمعالجون"): اسم + وصف + صورة من الجهاز
   - التخزين: مجموعة contactPosters (نفس اللي بتقرأها الصفحة الرئيسية)
   ============================================================ */

function psychEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
}

/* ================= الواجهة العامة (psych-session.html) ================= */
let psychDoctorsState = { list: [] };

async function psychFetchPublicList() {
    const snaps = await Promise.all([
        db.collection('contactPosters').get(),
        db.collection('psychDoctors').get().catch(() => null) // قديم: لحد ما يتنقل للقسم الجديد
    ]);
    const main = snaps[0].docs.map(d => ({ id: d.id, ...d.data() }));
    const seen = new Set(main.map(d => String(d.name || '').trim()));
    const legacy = snaps[1] ? snaps[1].docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !seen.has(String(d.name || '').trim())) : [];
    return main.concat(legacy.filter(d => d.active !== false));
}

async function psychInitPublic() {
    const grid = document.getElementById('psychDoctorsGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    let extras = [];
    try {
        extras = (await psychFetchPublicList())
            .filter(d => !(window.maanaIsPlaceholder && maanaIsPlaceholder(d.name)));
    } catch (e) {
        console.error(e);
    }
    psychDoctorsState.list = window.maanaMergeSpecialists ? maanaMergeSpecialists(extras) : (window.MAANA_SPECIALISTS || []).concat(extras);
    psychRenderGrid();
}

function psychRenderGrid() {
    const grid = document.getElementById('psychDoctorsGrid');
    if (!grid) return;

    if (!psychDoctorsState.list.length) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">لا يوجد أخصائيون متاحون حالياً.</p>';
        return;
    }

    grid.innerHTML = psychDoctorsState.list.map(d => {
        const href = window.maanaBookingUrl ? maanaBookingUrl(d) : 'https://wa.me/' + SITE_CONTACT.whatsapp;
        return `
        <div class="doctor-card fade-in">
            ${d.photo
                ? `<img class="doctor-photo" src="${psychEsc(d.photo)}" alt="${psychEsc(d.name)}" loading="lazy" decoding="async">`
                : '<div class="doctor-photo-placeholder"><i class="fas fa-user-doctor"></i></div>'}
            <div class="doctor-name">${psychEsc(d.name)}</div>
            ${d.role ? `<div class="doctor-role">${psychEsc(d.role)}</div>` : ''}
            ${d.tags ? `<div class="doctor-extra">${psychEsc(d.tags)}</div>` : ''}
            <a class="doctor-whatsapp-btn" href="${href}" target="_blank" rel="noopener">
                <i class="fab fa-whatsapp"></i> ${psychEsc(d.buttonText || 'حجز جلسة')}
            </a>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('psychDoctorsGrid')) psychInitPublic();
});

/* ================= لوحة الإدارة (admin.html) ================= */
let psychDoctorsAdminData = null;

/* أول مرة: ننقل الأطباء القدام (psychDoctors) للمجموعة الجديدة مرة واحدة */
async function psychMigrateLegacy(existing) {
    const flagRef = db.collection('settings').doc('posters');
    const flag = await flagRef.get();
    if (flag.exists && flag.data().psychMigrated) return existing;
    const old = await db.collection('psychDoctors').get();
    const names = new Set(existing.map(d => String(d.name || '').trim()));
    const batch = db.batch();
    let n = 0;
    old.docs.forEach(doc => {
        const d = doc.data();
        if (!d.name || names.has(String(d.name).trim()) || (window.maanaIsPlaceholder && maanaIsPlaceholder(d.name))) return;
        batch.set(db.collection('contactPosters').doc(), {
            name: d.name, role: d.role || '', photo: d.photo || '', whatsapp: d.whatsapp || '',
            order: d.order || 0, active: d.active !== false, buttonText: 'حجز جلسة'
        });
        n++;
    });
    batch.set(flagRef, { psychMigrated: true, seeded: true }, { merge: true });
    await batch.commit();
    if (!n) return existing;
    const snap = await db.collection('contactPosters').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* أول مرة: ننسخ الأخصائيين الأساسيين لقاعدة البيانات عشان يظهروا في اللوحة ويتعدلوا */
async function psychSeedBuiltins(existing) {
    const keys = new Set(existing.map(d => d.builtinKey).filter(Boolean));
    const todo = (window.MAANA_SPECIALISTS || []).filter(b => !keys.has(b.builtinKey));
    if (!todo.length) return existing;
    const batch = db.batch();
    todo.forEach(b => {
        batch.set(db.collection('contactPosters').doc(), {
            name: b.name, role: b.role || '', badge: b.badge || '', tags: b.tags || '', photo: b.photo || '',
            whatsapp: '', order: b.order, active: true, buttonText: 'حجز جلسة', builtinKey: b.builtinKey
        });
    });
    await batch.commit();
    const snap = await db.collection('contactPosters').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function renderAdminPsychDoctors() {
    const wrap = document.getElementById('psychDoctorsAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        const snap = await db.collection('contactPosters').get();
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list = await psychMigrateLegacy(list);
        list = await psychSeedBuiltins(list);
        psychDoctorsAdminData = { list: list.sort((a, b) => (a.order || 0) - (b.order || 0)) };
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<p style="color:var(--admin-text-muted);">تعذّر تحميل البيانات.</p>';
        return;
    }
    psychRenderAdmin();
}

function psychFormFields(d) {
    d = d || {};
    const v = k => psychEsc(d[k] || '');
    return `
        <div class="form-group"><label>اسم الأخصائي / المعالج</label><input type="text" name="name" value="${v('name')}" required placeholder="مثال: د/ أريج محمود"></div>
        <div class="form-group"><label>الوصف (التخصص)</label><input type="text" name="role" value="${v('role')}" placeholder="مثال: أخصائية تخاطب واضطرابات النطق"></div>
        <div class="form-group" style="grid-column:1/-1;"><label>الصورة — من الجهاز</label>${d.photo ? `<img class="mn-photo-prev" src="${v('photo')}" alt="">` : ''}<div class="mn-file-box"><input type="file" name="photoFile" accept="image/*"></div><input type="hidden" name="photo" value="${v('photo')}"></div>
        <div class="form-group"><label>الشارة على الصورة (اختياري)</label><input type="text" name="badge" value="${v('badge')}" placeholder="مثال: أخصائي نفسي"></div>
        <div class="form-group"><label>سطر إضافي تحت الاسم (اختياري)</label><input type="text" name="tags" value="${v('tags')}" placeholder="مثال: عضو اتحاد المعالجين النفسيين العرب"></div>
        <div class="form-group"><label>رقم واتساب (اختياري — لو فاضي يستخدم رقم الموقع)</label><input type="text" name="whatsapp" dir="ltr" value="${v('whatsapp')}" placeholder="201152013172"></div>
        <div class="form-group"><label>ترتيب العرض (الأصغر يظهر أول)</label><input type="number" name="order" value="${d.order || 0}"></div>
        <div class="form-group" style="align-self:end;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" name="active" ${d.active === false ? '' : 'checked'}> ظاهر في الرئيسية وصفحة "جلستك النفسية"
            </label>
        </div>`;
}

function psychRenderAdmin() {
    const wrap = document.getElementById('psychDoctorsAdminWrap');
    if (!wrap || !psychDoctorsAdminData) return;
    const list = psychDoctorsAdminData.list;
    const nextOrder = list.reduce((m, d) => Math.max(m, d.order || 0), 0) + 1;

    const itemsHtml = list.map(d => `
        <details style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;">
            <summary style="padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <span>${psychEsc(d.name || '(بدون اسم)')} ${d.active === false ? '<span style="color:#e05656;font-size:0.8rem;">(مخفي)</span>' : ''}</span>
                <button type="button" title="حذف" class="btn-outline" style="padding:4px 8px;color:#e05656;" onclick="event.preventDefault();psychDeleteDoctor('${d.id}')"><i class="fas fa-trash"></i></button>
            </summary>
            <form onsubmit="psychSaveDoctor(event, '${d.id}')" style="padding:0 16px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${psychFormFields(d)}
                <div class="form-group" style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ التعديلات</button></div>
            </form>
        </details>`).join('');

    wrap.innerHTML = `
        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">إضافة أخصائي / معالج جديد</h3>
            <form onsubmit="psychAddDoctor(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${psychFormFields({ order: nextOrder })}
                <div class="form-group" style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;"><i class="fas fa-plus"></i> إضافة</button></div>
            </form>
        </div>
        <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">كل الأخصائيين والمعالجين (${list.length})</h3>
        ${itemsHtml || '<p style="color:var(--admin-text-muted);">لا يوجد أحد بعد.</p>'}`;
}

/** يرفع الصورة من الجهاز ويرجّع الرابط، أو الرابط القديم لو مفيش ملف جديد */
async function psychUploadPhoto(f) {
    const file = f.photoFile && f.photoFile.files[0];
    if (!file) return f.photo.value.trim();
    const small = await mnPrepareImage(file, 1000, 0.88);
    const r = await mnUploadFile(small, 'posters/photos');
    return r.url;
}

function psychReadForm(f, photoUrl) {
    return {
        name: f.name.value.trim(),
        role: f.role.value.trim(),
        badge: f.badge.value.trim(),
        tags: f.tags.value.trim(),
        photo: photoUrl,
        whatsapp: f.whatsapp.value.replace(/[^0-9]/g, ''),
        order: Number(f.order.value) || 0,
        buttonText: 'حجز جلسة',
        active: !!f.active.checked,
    };
}

async function psychAddDoctor(event) {
    event.preventDefault();
    const f = event.target;
    const btn = f.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
        const photoUrl = await psychUploadPhoto(f);
        await db.collection('contactPosters').add(psychReadForm(f, photoUrl));
        showToast('تمت الإضافة — هيظهر في الرئيسية وصفحة جلستك النفسية');
        renderAdminPsychDoctors();
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ: ' + (e.message || e.code || ''), 'error');
        if (btn) btn.disabled = false;
    }
}

async function psychSaveDoctor(event, docId) {
    event.preventDefault();
    const f = event.target;
    const btn = f.querySelector('button[type=submit]');
    if (btn) btn.disabled = true;
    try {
        const photoUrl = await psychUploadPhoto(f);
        await db.collection('contactPosters').doc(docId).set(psychReadForm(f, photoUrl), { merge: true });
        showToast('تم حفظ التعديلات');
        renderAdminPsychDoctors();
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ: ' + (e.message || e.code || ''), 'error');
        if (btn) btn.disabled = false;
    }
}

async function psychDeleteDoctor(docId) {
    const cur = psychDoctorsAdminData && psychDoctorsAdminData.list.find(d => d.id === docId);
    if (cur && cur.builtinKey) {
        if (!confirm('هذا أخصائي أساسي في الموقع — هيتم إخفاؤه (ممكن ترجعه بتفعيل خانة "ظاهر"). متأكد؟')) return;
        try { await db.collection('contactPosters').doc(docId).set({ active: false }, { merge: true }); showToast('تم الإخفاء'); renderAdminPsychDoctors(); }
        catch (e) { console.error(e); showToast('تعذّر الإخفاء', 'error'); }
        return;
    }
    if (!confirm('حذف هذا الأخصائي؟')) return;
    try {
        await db.collection('contactPosters').doc(docId).delete();
        showToast('تم الحذف');
        renderAdminPsychDoctors();
    } catch (e) { console.error(e); showToast('تعذّر الحذف', 'error'); }
}
