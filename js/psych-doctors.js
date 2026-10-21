/* ============================================================
   أطباء جلستك النفسية — عرض عام (صورة + اسم + تخصص + زر واتساب)
   يُدار بالكامل من لوحة التحكم (إضافة / تعديل / حذف / ترتيب / تفعيل)
   يستخدم نفس Firebase الموجود في المشروع (js/firebase-config.js)
   ============================================================ */

/* ================= الواجهة العامة (psych-session.html) ================= */
let psychDoctorsState = { list: [] };

async function psychFetchPublicList() {
    const snap = await db.collection('psychDoctors').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.active !== false)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function psychInitPublic() {
    const grid = document.getElementById('psychDoctorsGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    // الأخصائيون الأساسيون (js/specialists.js) أولًا، وبعدهم اللي بيتضاف من لوحة التحكم
    let extras = [];
    try {
        extras = (await psychFetchPublicList())
            .filter(d => !(window.maanaIsPlaceholder && maanaIsPlaceholder(d.name)));
    } catch (e) {
        console.error(e);
    }
    psychDoctorsState.list = (window.MAANA_SPECIALISTS || []).concat(extras);
    psychRenderGrid();
}

function psychRenderGrid() {
    const grid = document.getElementById('psychDoctorsGrid');
    if (!grid) return;

    if (!psychDoctorsState.list.length) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">لا يوجد أطباء متاحون حالياً — يمكن للإدارة إضافتهم من لوحة التحكم.</p>';
        return;
    }

    grid.innerHTML = psychDoctorsState.list.map(d => {
        const href = window.maanaBookingUrl ? maanaBookingUrl(d) : 'https://wa.me/' + SITE_CONTACT.whatsapp;
        return `
        <div class="doctor-card fade-in">
            ${d.photo
                ? `<img class="doctor-photo" src="${d.photo}" alt="${(d.name || '').replace(/"/g, '&quot;')}" loading="lazy" decoding="async">`
                : '<div class="doctor-photo-placeholder"><i class="fas fa-user-doctor"></i></div>'}
            <div class="doctor-name">${d.name || ''}</div>
            ${d.role ? `<div class="doctor-role">${d.role}</div>` : ''}
            ${d.tags ? `<div class="doctor-extra">${d.tags}</div>` : ''}
            <a class="doctor-whatsapp-btn" href="${href}" target="_blank" rel="noopener">
                <i class="fab fa-whatsapp"></i> ${d.buttonText || 'حجز جلسة'}
            </a>
        </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('psychDoctorsGrid')) psychInitPublic();
});

/* ================= لوحة الإدارة (admin.html) ================= */
let psychDoctorsAdminData = null;

async function renderAdminPsychDoctors() {
    const wrap = document.getElementById('psychDoctorsAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        const snap = await db.collection('psychDoctors').get();
        psychDoctorsAdminData = {
            list: snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)),
        };
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<p style="color:var(--admin-text-muted);">تعذّر تحميل البيانات.</p>';
        return;
    }
    psychRenderAdmin();
}

function psychRenderAdmin() {
    const wrap = document.getElementById('psychDoctorsAdminWrap');
    if (!wrap || !psychDoctorsAdminData) return;

    const itemsHtml = psychDoctorsAdminData.list.map(d => `
        <details style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;">
            <summary style="padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;align-items:center;">
                <span>${d.name || '(بدون اسم)'} ${d.active === false ? '<span style="color:#e05656;font-size:0.8rem;">(غير مفعّل)</span>' : ''}</span>
                <button type="button" title="حذف" class="btn-outline" style="padding:4px 8px;color:#e05656;" onclick="event.preventDefault();psychDeleteDoctor('${d.id}')"><i class="fas fa-trash"></i></button>
            </summary>
            <form onsubmit="psychSaveDoctor(event, '${d.id}')" style="padding:0 16px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label>اسم الطبيب</label><input type="text" name="name" value="${(d.name || '').replace(/"/g, '&quot;')}" required></div>
                <div class="form-group"><label>التخصص (اختياري)</label><input type="text" name="role" value="${(d.role || '').replace(/"/g, '&quot;')}" placeholder="مثال: استشاري نفسي"></div>
                <div class="form-group" style="grid-column:1/-1;"><label>رابط صورة الطبيب</label><input type="text" name="photo" value="${(d.photo || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div class="form-group"><label>رقم واتساب (بصيغة دولية بدون + مثال: 201152013172)</label><input type="text" name="whatsapp" value="${(d.whatsapp || '').replace(/"/g, '&quot;')}" required placeholder="201152013172"></div>
                <div class="form-group"><label>ترتيب العرض</label><input type="number" name="order" value="${d.order || 0}"></div>
                <div class="form-group" style="grid-column:1/-1;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" name="active" ${d.active === false ? '' : 'checked'}>
                        ظاهر في صفحة "جلستك النفسية"
                    </label>
                </div>
                <div class="form-group" style="grid-column:1/-1;"><button type="submit" class="form-submit">حفظ بيانات الطبيب</button></div>
            </form>
        </details>`).join('');

    wrap.innerHTML = `
        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">إضافة طبيب جديد</h3>
            <form onsubmit="psychAddDoctor(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label>اسم الطبيب</label><input type="text" name="name" required></div>
                <div class="form-group"><label>التخصص (اختياري)</label><input type="text" name="role" placeholder="مثال: استشاري نفسي"></div>
                <div class="form-group" style="grid-column:1/-1;"><label>رابط صورة الطبيب</label><input type="text" name="photo" placeholder="https://..."></div>
                <div class="form-group"><label>رقم واتساب (بصيغة دولية بدون + مثال: 201152013172)</label><input type="text" name="whatsapp" required placeholder="201152013172"></div>
                <div class="form-group"><label>ترتيب العرض</label><input type="number" name="order" value="${psychDoctorsAdminData.list.length + 1}"></div>
                <div class="form-group" style="align-self:end;">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" name="active" checked>
                        ظاهر في صفحة "جلستك النفسية"
                    </label>
                </div>
                <div class="form-group" style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">إضافة الطبيب</button></div>
            </form>
        </div>

        <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">الأطباء الحاليون (${psychDoctorsAdminData.list.length})</h3>
        ${itemsHtml || '<p style="color:var(--admin-text-muted);">لا يوجد أطباء بعد.</p>'}`;
}

async function psychAddDoctor(event) {
    event.preventDefault();
    const f = event.target;
    const data = {
        name: f.name.value.trim(),
        role: f.role.value.trim(),
        photo: f.photo.value.trim(),
        whatsapp: f.whatsapp.value.trim().replace(/[^0-9]/g, ''),
        order: Number(f.order.value) || 0,
        active: !!f.active.checked,
    };
    await db.collection('psychDoctors').add(data);
    showToast('تم إضافة الطبيب');
    renderAdminPsychDoctors();
}

async function psychSaveDoctor(event, docId) {
    event.preventDefault();
    const f = event.target;
    const patch = {
        name: f.name.value.trim(),
        role: f.role.value.trim(),
        photo: f.photo.value.trim(),
        whatsapp: f.whatsapp.value.trim().replace(/[^0-9]/g, ''),
        order: Number(f.order.value) || 0,
        active: !!f.active.checked,
    };
    await db.collection('psychDoctors').doc(docId).set(patch, { merge: true });
    showToast('تم حفظ بيانات الطبيب');
    renderAdminPsychDoctors();
}

async function psychDeleteDoctor(docId) {
    if (!confirm('حذف هذا الطبيب؟')) return;
    await db.collection('psychDoctors').doc(docId).delete();
    showToast('تم الحذف');
    renderAdminPsychDoctors();
}
