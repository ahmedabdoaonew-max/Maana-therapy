/* ============================================
   لوحة تحكم السوبر أدمن - admin.js
   إدارة المحاضرات، المستخدمين، الإحصائيات، المحتوى
   ============================================ */

// ========== حماية لوحة التحكم (آمنة) ==========
document.addEventListener('DOMContentLoaded', async () => {
    // أخفي اللوحة فوراً لحد ما يتم التحقق من الصلاحيات
    document.body.style.visibility = 'hidden';

    const allowed = await requireAdmin();
    if (!allowed) return;

    // إظهار اللوحة بعد التأكد إن المستخدم أدمن فعلاً
    document.body.style.visibility = 'visible';

    // تحديث الإحصائيات
    updateDashboardStats();

    // عرض القسم الافتراضي
    showAdminSection('dashboard');
});

// ========== التنقل بين أقسام اللوحة ==========
function toggleAdminSidebar() {
    var sb = document.getElementById('adminSidebar');
    var ov = document.getElementById('adminOverlay');
    if (!sb) return;
    sb.classList.toggle('open');
    if (ov) ov.classList.toggle('show');
}
function closeAdminSidebar() {
    var sb = document.getElementById('adminSidebar');
    var ov = document.getElementById('adminOverlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
}

function showAdminSection(section) {
    closeAdminSidebar();

    // إخفاء الكل
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));

    const el = document.getElementById('admin-' + section);
    if (el) el.style.display = 'block';

    const navLink = document.querySelector(`.admin-nav a[data-section="${section}"]`);
    if (navLink) navLink.classList.add('active');

    // تحميل البيانات حسب القسم
    if (section === 'lectures') showLecturesTab(window.__lecTab || 'paid');
    if (section === 'podcast') renderAdminPodcast();
    if (section === 'psych-doctors') renderAdminPsychDoctors();
    if (section === 'users') renderAdminUsers();
    if (section === 'payments') renderAdminPayments();
    if (section === 'certificates') renderAdminCertificates();
    if (section === 'requests') renderAccessRequests();
}

// ========== تبويبات قسم المحاضرات (المحاضرات والأكواد + باقة المحاضرات) ==========
function showLecturesTab(tab) {
    window.__lecTab = tab = (tab === 'package') ? 'package' : 'paid';
    var paid = document.getElementById('lecPane-paid');
    var pack = document.getElementById('lecPane-package');
    var addBtn = document.getElementById('lecAddBtn');
    if (paid) paid.style.display = tab === 'paid' ? 'block' : 'none';
    if (pack) pack.style.display = tab === 'package' ? 'block' : 'none';
    if (addBtn) addBtn.style.display = tab === 'paid' ? '' : 'none';
    document.querySelectorAll('#lecturesTabs .admin-tab').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    if (tab === 'paid') renderAdminLectures(); else renderAdminOnlineLectures(1);
}

// ========== مساعد: عرض سبب فشل تحميل البيانات (مثلاً قواعد Firestore) ==========
function adminErrorText(e) {
    const code = (e && e.code) || '';
    if (code === 'permission-denied' || /permission/i.test((e && e.message) || '')) {
        return 'تم رفض القراءة من Firestore (permission-denied). انشر ملف firestore.rules في مشروع Firebase المستخدم، وتأكد إن حسابك فيه role = admin أو super_admin في مجموعة users.';
    }
    if (code === 'failed-precondition') {
        return 'Firestore محتاج Index لهذا الاستعلام — افتح Console (F12) واضغط على الرابط اللي بيظهر في الخطأ لإنشائه.';
    }
    return 'تعذّر تحميل البيانات: ' + (code || (e && e.message) || 'خطأ غير معروف');
}
function adminAnchor(id) {
    if (id === 'statUsers') return document.querySelector('#admin-dashboard .stats-row');
    const host = document.getElementById(id);
    return host && (host.closest('table') || host);
}
function adminShowError(containerId, e) {
    console.error(e);
    const anchor = adminAnchor(containerId);
    if (!anchor || !anchor.parentElement) return;
    let box = anchor.parentElement.querySelector(':scope > .admin-load-error');
    if (!box) {
        box = document.createElement('div');
        box.className = 'admin-load-error';
        anchor.parentElement.insertBefore(box, anchor);
    }
    box.textContent = adminErrorText(e);
}
function adminClearError(containerId) {
    const anchor = adminAnchor(containerId);
    const box = anchor && anchor.parentElement && anchor.parentElement.querySelector(':scope > .admin-load-error');
    if (box) box.remove();
}
function adminFmtDate(v) {
    if (!v) return '-';
    try {
        const d = v.toDate ? v.toDate() : new Date(v);
        return isNaN(d) ? '-' : d.toLocaleString('ar-EG');
    } catch (e) { return '-'; }
}

// المشاهدات الحقيقية من Firestore: عدّادات المحاضرات (كانت بتتقري من localStorage فاضي)
async function getAllViewsAsync() {
    const r = await db.collection('registrations').get();
    const out = [];
    r.forEach(d => { const v = d.data(); out.push({ code: v.lectureId || d.id, name: v.name || '-', count: v.viewCount || 0, at: v.lastAccess }); });
    return out.sort((x, y) => String(y.at || '').localeCompare(String(x.at || '')));
}

// ========== الإحصائيات ==========
async function updateDashboardStats() {
    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    const safe = async (fn, fallback) => {
        try { return await fn(); } catch (e) { adminShowError('statUsers', e); return fallback; }
    };

    const users = await safe(() => getUsersAsync(), {});
    const lectures = await safe(() => getLecturesAsync(), {});
    const views = await safe(() => getAllViewsAsync(), []);
    const subs = await safe(async () => (await db.collection('subscriptionRequests').get()).docs.map(d => d.data()), []);
    const certsCount = await safe(async () => (await db.collection('certificates').get()).size, 0);

    set('statUsers', Object.keys(users).filter(k => !users[k].isAdmin).length);
    set('statLectures', Object.keys(lectures).length);
    set('statViews', views.reduce((n, v) => n + (v.count || 0), 0));
    set('statCerts', certsCount);
    set('statPayments', subs.filter(s => s.status === 'approved').length);
    set('statActive', Object.values(users).filter(u => !u.blocked && !u.isAdmin).length);
}

// ========== إدارة المحاضرات ==========
// ========== طريقة وصول المحاضرات (دفع أونلاين / موافقة واتساب) ==========
async function loadLecturesHubSettings() {
    const modeEl = document.getElementById('lecturesAccessMode');
    const waEl = document.getElementById('lecturesWhatsappNumber');
    if (!modeEl || !waEl) return;
    try {
        const doc = await db.collection('settings').doc('lecturesHub').get();
        const s = doc.exists ? doc.data() : {};
        modeEl.value = s.accessMode || 'payment';
        waEl.value = s.whatsappNumber || '';
    } catch (e) {
        console.error(e);
    }
}

async function saveLecturesHubSettings(event) {
    event.preventDefault();
    const mode = document.getElementById('lecturesAccessMode').value;
    const wa = document.getElementById('lecturesWhatsappNumber').value.trim();
    try {
        await db.collection('settings').doc('lecturesHub').set({
            accessMode: mode,
            whatsappNumber: wa
        }, { merge: true });
        showToast('تم حفظ إعدادات وصول المحاضرات');
    } catch (e) {
        console.error(e);
        showToast('فشل حفظ الإعدادات', 'error');
    }
}

async function renderAdminLectures() {
    const tbody = document.getElementById('lecturesTableBody');
    if (!tbody) return;

    loadLecturesHubSettings();

    const lectures = await getLecturesAsync();
    tbody.innerHTML = '';

    Object.values(lectures).forEach(lec => {
        const viewsCount = lec.viewCount || 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${lec.id}</strong></td>
            <td>${lec.title}</td>
            <td>${lec.price} ج.م</td>
            <td>${lec.maxViews === 0 ? '∞' : lec.maxViews}</td>
            <td>${viewsCount}</td>
            <td><span class="badge ${lec.active ? 'badge-success' : 'badge-danger'}">${lec.active ? 'نشطة' : 'معطلة'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-sm btn-edit" onclick="editLecture('${lec.id}')">تعديل</button>
                    <button class="btn-sm btn-delete" onclick="deleteLecture('${lec.id}')">حذف</button>
                    <button class="btn-sm btn-view" onclick="toggleLecture('${lec.id}')">${lec.active ? 'تعطيل' : 'تفعيل'}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/** إدارة المحاضرات الأونلاين — 4 أقسام × حتى 8 محاضرات لكل قسم */
let _olAdminCurrentCat = 1;

async function renderAdminOnlineLectures(categoryId) {
    _olAdminCurrentCat = categoryId;
    const grid = document.getElementById('onlineLecturesGrid');
    if (!grid) return;

    document.querySelectorAll('.ol-admin-tab').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.cat, 10) === categoryId);
    });

    // تحميل بيانات القسم (العنوان + الصور) في نموذج التعديل
    try {
        const catDoc = await db.collection('onlineCategories').doc(String(categoryId)).get();
        const defaults = { 1: 'أساسيات الإدارة والقيادة', 2: 'تطوير المهارات المهنية', 3: 'التواصل والعرض التقديمي', 4: 'الجودة وإدارة المشاريع' };
        const data = catDoc.exists ? catDoc.data() : {};
        document.getElementById('olCatTitle').value = data.title || defaults[categoryId] || '';
        document.getElementById('olCatImg1').value = data.img1 || '';
        document.getElementById('olCatImg2').value = data.img2 || '';
        document.getElementById('olCatImg1File').value = '';
        document.getElementById('olCatImg2File').value = '';
        document.getElementById('olCatImg1Note').textContent = data.img1 ? 'يوجد صورة محفوظة — اختر ملفاً جديداً لاستبدالها' : '';
        document.getElementById('olCatImg2Note').textContent = data.img2 ? 'يوجد صورة محفوظة — اختر ملفاً جديداً لاستبدالها' : '';
    } catch (e) { console.error(e); }

    // تحميل رقم الواتساب (إعداد عام وليس لكل قسم)
    try {
        const settingsDoc = await db.collection('settings').doc('onlineLectures').get();
        document.getElementById('olWhatsappSetting').value = settingsDoc.exists ? (settingsDoc.data().whatsappNumber || '') : '';
    } catch (e) { console.error(e); }

    const allLectures = await getLecturesAsync();
    const catLectures = Object.values(allLectures)
        .filter(l => l.onlineCategory === categoryId)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    grid.innerHTML = '';
    const slots = 8;
    for (let i = 0; i < slots; i++) {
        const lec = catLectures[i];
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:16px;';

        if (lec) {
            card.innerHTML = `
                <h4 style="color:var(--admin-text);font-size:0.95rem;margin-bottom:4px;">${lec.title}</h4>
                <p style="color:var(--admin-text-muted);font-size:0.8rem;margin-bottom:10px;">${lec.id} — ${lec.price} ج.م</p>
                <span class="badge ${lec.active ? 'badge-success' : 'badge-danger'}" style="margin-bottom:10px;display:inline-block;">${lec.active ? 'نشطة' : 'معطلة'}</span>
                <div class="action-btns" style="margin-top:8px;">
                    <button class="btn-sm btn-edit" onclick="editLecture('${lec.id}')">تعديل</button>
                    <button class="btn-sm btn-delete" onclick="deleteOnlineLecture('${lec.id}', ${categoryId})">حذف</button>
                </div>
            `;
        } else {
            card.style.cssText += 'display:flex;align-items:center;justify-content:center;min-height:120px;border-style:dashed;';
            card.innerHTML = `
                <button type="button" class="btn-outline" onclick="openAddOnlineLectureModal(${categoryId})" style="border:none;color:var(--admin-text-muted);cursor:pointer;">
                    <i class="fas fa-plus"></i><br>إضافة محاضرة
                </button>
            `;
        }
        grid.appendChild(card);
    }
}

async function saveOnlineCategoryInfo(event) {
    event.preventDefault();
    const title = document.getElementById('olCatTitle').value.trim();
    let img1 = document.getElementById('olCatImg1').value.trim();
    let img2 = document.getElementById('olCatImg2').value.trim();
    try {
        const f1 = document.getElementById('olCatImg1File').files[0];
        const f2 = document.getElementById('olCatImg2File').files[0];
        if (f1) img1 = (await mnUploadFile(await mnPrepareImage(f1, 800), 'categories')).url;
        if (f2) img2 = (await mnUploadFile(await mnPrepareImage(f2, 800), 'categories')).url;
        await db.collection('onlineCategories').doc(String(_olAdminCurrentCat)).set({ title, img1, img2 }, { merge: true });
        document.getElementById('olCatImg1').value = img1;
        document.getElementById('olCatImg2').value = img2;
        document.getElementById('olCatImg1File').value = '';
        document.getElementById('olCatImg2File').value = '';
        document.getElementById('olCatImg1Note').textContent = img1 ? 'يوجد صورة محفوظة — اختر ملفاً جديداً لاستبدالها' : '';
        document.getElementById('olCatImg2Note').textContent = img2 ? 'يوجد صورة محفوظة — اختر ملفاً جديداً لاستبدالها' : '';
        showToast('تم حفظ بيانات القسم');
    } catch (e) {
        console.error(e);
        showToast(e.message && !e.code ? e.message : 'فشل الحفظ — تحقق من صلاحياتك', 'error');
    }
}

async function saveOnlineLecturesWhatsapp(event) {
    event.preventDefault();
    const number = document.getElementById('olWhatsappSetting').value.trim();
    try {
        await db.collection('settings').doc('onlineLectures').set({ whatsappNumber: number }, { merge: true });
        showToast('تم حفظ رقم الواتساب');
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ — تحقق من صلاحياتك', 'error');
    }
}

async function deleteOnlineLecture(id, categoryId) {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;
    try {
        await deleteLectureDoc(id);
        await renderAdminOnlineLectures(categoryId);
        showToast('تم الحذف');
    } catch (e) {
        console.error(e);
        showToast('فشل الحذف', 'error');
    }
}

function openAddLectureModal() {
    document.getElementById('lectureFormTitle').textContent = 'إضافة محاضرة جديدة';
    document.getElementById('lecId').value = '';
    document.getElementById('lecId').readOnly = false;
    document.getElementById('lecId').placeholder = 'مثال: LEC-100 أو اتركه فارغاً للتوليد التلقائي';
    document.getElementById('lecTitle').value = '';
    document.getElementById('lecUrl').value = '';
    var _lf = document.getElementById('lecFile'); if (_lf) _lf.value = '';
    document.getElementById('lecPrice').value = '50';
    document.getElementById('lecMaxViews').value = '1';
    document.getElementById('lecActive').checked = true;
    document.getElementById('lecOnlineCategory').value = '';
    document.getElementById('lectureFormModal').classList.add('active');
}

function openAddOnlineLectureModal(categoryId) {
    openAddLectureModal();
    document.getElementById('lectureFormTitle').textContent = 'محاضرة أونلاين جديدة';
    document.getElementById('lecOnlineCategory').value = categoryId;
}

async function editLecture(id) {
    const doc = await db.collection('lectures').doc(id).get();
    if (!doc.exists) return;
    const lec = doc.data();
    const url = lec.onlineCategory ? (lec.mediaUrl || '') : await getLectureVideoUrl(id);

    document.getElementById('lectureFormTitle').textContent = 'تعديل المحاضرة';
    document.getElementById('lecId').value = id;
    document.getElementById('lecId').readOnly = true;
    document.getElementById('lecTitle').value = lec.title;
    document.getElementById('lecUrl').value = url;
    var _lf2 = document.getElementById('lecFile'); if (_lf2) _lf2.value = '';
    document.getElementById('lecPrice').value = lec.price;
    document.getElementById('lecMaxViews').value = lec.maxViews;
    document.getElementById('lecActive').checked = lec.active;
    document.getElementById('lecOnlineCategory').value = lec.onlineCategory || '';
    document.getElementById('lectureFormModal').classList.add('active');
}

async function saveLecture(event) {
    event.preventDefault();
    let idInput = document.getElementById('lecId').value.trim().toUpperCase().replace(/\s+/g, '-');
    const title = document.getElementById('lecTitle').value.trim();
    let url = document.getElementById('lecUrl').value.trim();
    const lecFile = (document.getElementById('lecFile') || {}).files && document.getElementById('lecFile').files[0];
    const price = parseFloat(document.getElementById('lecPrice').value) || 0;
    const maxViews = parseInt(document.getElementById('lecMaxViews').value) || 1;
    const active = document.getElementById('lecActive').checked;
    const isEdit = document.getElementById('lecId').readOnly;
    const onlineCategoryRaw = document.getElementById('lecOnlineCategory').value;
    const onlineCategory = onlineCategoryRaw ? parseInt(onlineCategoryRaw, 10) : null;

    if (!title || (!url && !lecFile)) {
        showToast('اكتب العنوان وارفع الفيديو من جهازك (أو الصق رابطاً)', 'error');
        return;
    }

    let id = idInput || generateCode('LEC');

    if (!isEdit) {
        const existing = await db.collection('lectures').doc(id).get();
        if (existing.exists) {
            showToast('هذا الكود مستخدم مسبقاً. اختر كوداً آخر', 'error');
            return;
        }
    }

    const saveBtn = event.target.querySelector('button[type=submit]');
    try {
        if (lecFile) {
            if (saveBtn) saveBtn.disabled = true;
            const ui = mnProgressUI(document.getElementById('lecUploadProgress'));
            const up = await mnCloudUploadMedia(lecFile, 'maana/lectures', function (p) { ui.set(p, 'رفع الفيديو'); });
            url = up.url;
            ui.done('تم الرفع');
        }
        const metadata = {
            id: id,
            title: title,
            price: price,
            maxViews: maxViews,
            active: active,
            createdAt: isEdit ? undefined : new Date().toISOString().split('T')[0]
        };
        if (onlineCategory) {
            metadata.onlineCategory = onlineCategory;
            // نظام المحاضرات الأونلاين مبسّط بدون Cloud Function — الرابط يُخزَّن
            // مباشرة في المستند العام (وليس secureContent) حسب طلب المستخدم.
            metadata.mediaUrl = url;
            await saveLectureDoc(id, metadata);
        } else {
            await saveLectureDoc(id, metadata, url);
        }

        closeLectureForm();
        if (onlineCategory) {
            await renderAdminOnlineLectures(onlineCategory);
        } else {
            await renderAdminLectures();
        }
        await updateDashboardStats();
        showToast('تم حفظ المحاضرة — الكود: ' + id);
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ: ' + (e && e.message ? e.message : 'تحقق من صلاحياتك'), 'error');
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function deleteLecture(id) {
    if (!confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) return;
    try {
        await deleteLectureDoc(id);
        await renderAdminLectures();
        await updateDashboardStats();
        showToast('تم الحذف');
    } catch (e) {
        console.error(e);
        showToast('فشل الحذف', 'error');
    }
}

async function toggleLecture(id) {
    try {
        const doc = await db.collection('lectures').doc(id).get();
        if (!doc.exists) return;
        const active = !doc.data().active;
        await db.collection('lectures').doc(id).update({ active });
        await renderAdminLectures();
        showToast(active ? 'تم التفعيل' : 'تم التعطيل');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}

function closeLectureForm() {
    document.getElementById('lectureFormModal').classList.remove('active');
}

// ========== إدارة المستخدمين ==========
async function renderAdminUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    let users;
    try { users = await getUsersAsync(); adminClearError('usersTableBody'); }
    catch (e) { adminShowError('usersTableBody', e); tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">تعذّر تحميل المستخدمين</td></tr>'; return; }
    tbody.innerHTML = '';
    if (!Object.values(users).some(u => !u.isAdmin)) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا يوجد مستخدمون مسجّلون بعد</td></tr>';
    }

    Object.values(users).forEach(u => {
        if (u.isAdmin) return; // لا نعرض الأدمن في القائمة العادية
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone || '-'}</td>
            <td><span class="badge badge-info">${u.subscriptionType}</span></td>
            <td><span class="badge ${u.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}">${u.paymentStatus === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></td>
            <td><span class="badge ${u.blocked ? 'badge-danger' : 'badge-success'}">${u.blocked ? 'محظور' : 'نشط'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-sm btn-edit" onclick="editUser('${u.id}')">صلاحيات</button>
                    <button class="btn-sm ${u.blocked ? 'btn-view' : 'btn-delete'}" onclick="toggleBlockUser('${u.id}')">
                        ${u.blocked ? 'فك الحظر' : 'حظر'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function editUser(id) {
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return;
    const user = _profileFromDoc(id, doc.data());

    document.getElementById('editUserId').value = id;
    document.getElementById('editUserName').textContent = user.name;
    document.getElementById('editSubType').value = user.subscriptionType || 'free';
    document.getElementById('editPayStatus').value = user.paymentStatus || 'unpaid';

    // الأقسام
    const container = document.getElementById('sectionsCheckboxes');
    container.innerHTML = '';
    sectionsData.forEach(s => {
        const checked = user.allowedSections && user.allowedSections.includes(s.id) ? 'checked' : '';
        container.innerHTML += `
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;cursor:pointer;">
                <input type="checkbox" value="${s.id}" ${checked} class="sec-check">
                <span>${s.id}. ${s.title}</span>
            </label>
        `;
    });

    document.getElementById('userEditModal').classList.add('active');
}

async function saveUserPermissions(event) {
    event.preventDefault();
    const id = document.getElementById('editUserId').value;

    const checks = document.querySelectorAll('.sec-check:checked');
    let allowed = Array.from(checks).map(c => parseInt(c.value));
    const subscriptionType = document.getElementById('editSubType').value;
    const paymentStatus = document.getElementById('editPayStatus').value;

    // إذا بريميوم ومدفوع، افتح كل الأقسام
    if (subscriptionType === 'premium' && paymentStatus === 'paid') {
        allowed = [1,2,3,4,5,6,7,8,9,10,11,12,13];
    }

    try {
        // هذا التحديث يمر عبر Firestore Rules التي تسمح فقط للأدمن
        // بتعديل صلاحيات مستخدم آخر (راجع firestore.rules)
        await updateUserDoc(id, {
            allowedSections: allowed,
            subscriptionType: subscriptionType,
            paymentStatus: paymentStatus
        });

        document.getElementById('userEditModal').classList.remove('active');
        await renderAdminUsers();
        showToast('تم تحديث صلاحيات المستخدم');
    } catch (e) {
        console.error(e);
        showToast('فشل التحديث — تحقق من صلاحياتك', 'error');
    }
}

async function toggleBlockUser(id) {
    try {
        const doc = await db.collection('users').doc(id).get();
        const current = !!(doc.exists && doc.data().blocked);
        await updateUserDoc(id, { blocked: !current });
        await renderAdminUsers();
        showToast(!current ? 'تم حظر المستخدم' : 'تم فك الحظر');
    } catch (e) {
        console.error(e);
        showToast('فشل تنفيذ العملية — تحقق من صلاحياتك', 'error');
    }
}

// ========== سجل المشاهدات ==========
async function renderAdminViews() {
    const tbody = document.getElementById('viewsTableBody');
    if (!tbody) return;
    try {
        const list = await getAllViewsAsync();
        adminClearError('viewsTableBody');
        tbody.innerHTML = list.slice(0, 100).map(v => `
            <tr>
                <td>${v.code}</td>
                <td>${v.name} <small style="color:var(--admin-text-muted);">(${v.count} مشاهدة)</small></td>
                <td>${adminFmtDate(v.at)}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">لا توجد مشاهدات</td></tr>';
    } catch (e) {
        adminShowError('viewsTableBody', e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">تعذّر التحميل</td></tr>';
    }
}

// ========== المدفوعات ==========
async function renderAdminPayments() {
    const tbody = document.getElementById('paymentsTableBody');
    if (!tbody) return;
    try {
        const snap = await db.collection('subscriptionRequests').get();
        adminClearError('paymentsTableBody');
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const st = { approved: 'مفعّل', rejected: 'مرفوض', pending: 'قيد الانتظار' };
        tbody.innerHTML = list.map(p => `
            <tr>
                <td>${p.id.slice(0, 8)}</td>
                <td>${p.sectionTitle || p.sectionId || '-'}</td>
                <td>${p.amount ? p.amount + ' ج.م' : '-'}</td>
                <td>${p.method || 'واتساب'}</td>
                <td>${p.userName || '-'}</td>
                <td>${adminFmtDate(p.createdAt)}</td>
                <td><span class="badge ${p.status === 'approved' ? 'badge-success' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">${st[p.status] || p.status || '-'}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center;">لا توجد اشتراكات</td></tr>';
    } catch (e) {
        adminShowError('paymentsTableBody', e);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">تعذّر التحميل</td></tr>';
    }
}

// ========== الشهادات ==========
function renderAdminCertificates() {
    const tbody = document.getElementById('certsTableBody');
    if (!tbody) return;

    const certs = getCertificates();
    tbody.innerHTML = Object.values(certs).map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>${c.courseName}</td>
            <td>${c.date}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editCert('${c.id}')">تعديل</button>
                <button class="btn-sm btn-delete" onclick="deleteCert('${c.id}')">حذف</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center;">لا توجد شهادات</td></tr>';
}

function openAddCertModal() {
    var set = function(id, v) { var el = document.getElementById(id); if (el) el.value = v; };
    set('certSecretId', '');
    document.getElementById('certSecretId').readOnly = false;
    set('certName', '');
    set('certPhoto', '');
    set('certImage', '');
    certResetFiles();
    set('certCourse', '');
    set('certYear', new Date().getFullYear().toString());
    set('certGrade', '');
    set('certDoctor', 'Maana Therapy');
    set('certDate', new Date().toISOString().split('T')[0]);
    set('certDuration', '');
    set('certEmail', '');
    set('certPhone', '');
    document.getElementById('certFormModal').querySelector('.modal-header h3').textContent = 'إصدار شهادة جديدة';
    document.getElementById('certFormModal').classList.add('active');
}

function editCert(id) {
    const certs = getCertificates();
    const c = certs[id];
    if (!c) return;
    var set = function(fid, v) { var el = document.getElementById(fid); if (el) el.value = v || ''; };
    set('certSecretId', id);
    document.getElementById('certSecretId').readOnly = true;
    set('certName', c.name);
    set('certPhoto', c.photoUrl);
    set('certImage', c.certificateImageUrl);
    certResetFiles(c);
    set('certCourse', c.courseName);
    set('certYear', c.graduationYear);
    set('certGrade', c.grade);
    set('certDoctor', c.doctorName || 'Maana Therapy');
    set('certDate', c.date);
    set('certDuration', c.duration);
    set('certEmail', c.email);
    set('certPhone', c.phone);
    document.getElementById('certFormModal').querySelector('.modal-header h3').textContent = 'تعديل الشهادة';
    document.getElementById('certFormModal').classList.add('active');
}

function certResetFiles(c) {
    ['certPhotoFile', 'certImageFile'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    var n1 = document.getElementById('certPhotoNote'), n2 = document.getElementById('certImageNote');
    if (n1) n1.textContent = c && c.photoUrl ? 'يوجد ملف محفوظ — اختر ملفاً جديداً لاستبداله' : '';
    if (n2) n2.textContent = c && c.certificateImageUrl ? 'يوجد ملف محفوظ — اختر ملفاً جديداً لاستبداله' : '';
}

async function saveCertificate(event) {
    event.preventDefault();
    var name = document.getElementById('certName').value.trim();
    var course = document.getElementById('certCourse').value.trim();
    var date = document.getElementById('certDate').value;
    var secretId = (document.getElementById('certSecretId').value || '').trim().toUpperCase();
    var isEdit = document.getElementById('certSecretId').readOnly;
    var photo = (document.getElementById('certPhoto') || {}).value || '';
    var certImage = (document.getElementById('certImage') || {}).value || '';
    var year = (document.getElementById('certYear') || {}).value || '';
    var grade = (document.getElementById('certGrade') || {}).value || '';
    var doctor = (document.getElementById('certDoctor') || {}).value || 'Maana Therapy';

    var duration = (document.getElementById('certDuration') || {}).value || '';
    var email = (document.getElementById('certEmail') || {}).value || '';
    var phone = (document.getElementById('certPhone') || {}).value || '';

    if (!name || !course) {
        showToast('املأ الحقول الأساسية', 'error');
        return;
    }

    var certs = getCertificates();
    var id = secretId || generateCode('CERT');
    if (!isEdit && certs[id]) {
        showToast('هذا الكود مستخدم مسبقاً', 'error');
        return;
    }

    // رفع الصور من الجهاز (إن اختارها الأدمن)
    var pFile = (document.getElementById('certPhotoFile') || {}).files;
    var iFile = (document.getElementById('certImageFile') || {}).files;
    var submitBtn = event.target.querySelector('button[type=submit]');
    if ((pFile && pFile[0]) || (iFile && iFile[0])) {
        var ui = mnProgressUI(document.getElementById('certUploadProgress'));
        if (submitBtn) submitBtn.disabled = true;
        try {
            if (pFile && pFile[0]) {
                var pf = await mnPrepareImage(pFile[0], 900);
                photo = (await mnUploadFile(pf, 'certificates/photos', function (p) { ui.set(p * 0.5, 'رفع صورة المتدرب'); })).url;
            }
            if (iFile && iFile[0]) {
                var cf = await mnPrepareImage(iFile[0], 2000, 0.9);
                certImage = (await mnUploadFile(cf, 'certificates/images', function (p) { ui.set(0.5 + p * 0.5, 'رفع صورة الشهادة'); })).url;
            }
            ui.done('تم الرفع');
        } catch (err) {
            console.error(err);
            showToast('فشل رفع الصورة: ' + (err.code || err.message || 'خطأ'), 'error');
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
        if (submitBtn) submitBtn.disabled = false;
    }
    certs[id] = {
        id: id,
        secretId: id,
        code: id,
        name: name,
        courseName: course,
        grantName: course,
        graduationYear: year,
        grade: grade,
        doctorName: doctor,
        photoUrl: photo.trim(),
        certificateImageUrl: certImage.trim(),
        certificateNumber: id,
        duration: duration.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date: date
    };
    saveCertificates(certs);

    document.getElementById('certFormModal').classList.remove('active');
    renderAdminCertificates();
    updateDashboardStats();
    showToast(isEdit ? 'تم تحديث الشهادة' : 'تم إصدار الشهادة — الكود السري: ' + id);
}

function deleteCert(id) {
    if (!confirm('حذف الشهادة؟')) return;
    deleteCertificateById(id);
    renderAdminCertificates();
    updateDashboardStats();
    showToast('تم الحذف');
}

// ========== الإعدادات ==========
function loadAdminSettings() {
    const settings = getSettings();
    document.getElementById('settingCvUrl').value = settings.cvUrl || '';
    const splash = document.getElementById('settingSplashImage');
    const logo = document.getElementById('settingLogoImage');
    const siteImage = document.getElementById('settingSiteImage');
    const appIcon = document.getElementById('settingAppIcon');
    if (splash) splash.value = settings.splashImage || (typeof SITE_BRANDING !== 'undefined' ? SITE_BRANDING.splashImage : '') || '';
    if (logo) logo.value = settings.logoImage || (typeof SITE_BRANDING !== 'undefined' ? SITE_BRANDING.logoImage : '') || '';
    if (siteImage) siteImage.value = settings.siteImage || '';
    if (appIcon) appIcon.value = settings.appIcon || '';
    document.getElementById('settingWhatsapp').value = settings.contactWhatsapp || '';
    document.getElementById('settingEmail').value = settings.contactEmail || '';
}

function saveAdminSettings(event) {
    event.preventDefault();
    const settings = getSettings();
    settings.cvUrl = document.getElementById('settingCvUrl').value.trim();
    const splashEl = document.getElementById('settingSplashImage');
    const logoEl = document.getElementById('settingLogoImage');
    const siteImageEl = document.getElementById('settingSiteImage');
    const appIconEl = document.getElementById('settingAppIcon');
    if (splashEl) settings.splashImage = splashEl.value.trim();
    if (logoEl) settings.logoImage = logoEl.value.trim();
    if (siteImageEl) settings.siteImage = siteImageEl.value.trim();
    if (appIconEl) settings.appIcon = appIconEl.value.trim();
    settings.contactWhatsapp = document.getElementById('settingWhatsapp').value.trim();
    settings.contactEmail = document.getElementById('settingEmail').value.trim();
    saveSettings(settings);
    if (typeof applyBrandingImages === 'function') applyBrandingImages();
    showToast('تم حفظ الإعدادات — التغييرات هتظهر فوراً لكل زوار الموقع');
}

// ========== سجل الدخول ==========
async function renderLoginLogs() {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    try {
        const users = await getUsersAsync();
        adminClearError('logsTableBody');
        const list = Object.values(users).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        tbody.innerHTML = list.slice(0, 100).map(u => `
            <tr>
                <td>${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${adminFmtDate(u.createdAt)}</td>
            </tr>
        `).join('') || '<tr><td colspan="3" style="text-align:center;">لا توجد سجلات</td></tr>';
    } catch (e) {
        adminShowError('logsTableBody', e);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">تعذّر التحميل</td></tr>';
    }
}

// ========== إعدادات الأقسام (مجاني/مدفوع/رابط خارجي/كود دخول) ==========
async function renderSectionSettings() {
    const container = document.getElementById('sectionSettingsList');
    if (!container) return;

    await refreshSectionSettingsCache();
    const settings = getSectionSettings();

    container.innerHTML = sectionsData.map(s => {
        const st = Object.assign({ free: s.free, active: true, linkType: 'internal', externalUrl: '', accessCode: '' }, settings[s.id] || {});
        return `
            <div style="background:white;border-radius:10px;padding:16px;margin-bottom:10px;box-shadow:var(--shadow);">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
                    <strong>${s.id}. ${s.title}</strong>
                    <div style="display:flex;gap:16px;align-items:center;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" ${st.free ? 'checked' : ''} onchange="toggleSectionFree(${s.id}, this.checked)">
                            مجاني
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="checkbox" ${st.active !== false ? 'checked' : ''} onchange="toggleSectionActive(${s.id}, this.checked)">
                            نشط
                        </label>
                    </div>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                    <select id="secLinkType_${s.id}" onchange="onSectionLinkTypeChange(${s.id})" style="padding:8px;border-radius:6px;border:1px solid #ddd;">
                        <option value="internal" ${st.linkType === 'internal' ? 'selected' : ''}>رابط داخلي (صفحة القسم العادية)</option>
                        <option value="external" ${st.linkType === 'external' ? 'selected' : ''}>رابط خارجي (ينقل لموقع آخر)</option>
                        <option value="code" ${st.linkType === 'code' ? 'selected' : ''}>محمي بكود دخول</option>
                    </select>
                    <input type="text" id="secExternalUrl_${s.id}" placeholder="https://..."
                        value="${st.externalUrl || ''}"
                        style="flex:1;min-width:180px;padding:8px;border-radius:6px;border:1px solid #ddd;${st.linkType === 'external' ? '' : 'display:none;'}">
                    <input type="text" id="secAccessCode_${s.id}" placeholder="كود الدخول"
                        value="${st.accessCode || ''}"
                        style="flex:1;min-width:140px;padding:8px;border-radius:6px;border:1px solid #ddd;${st.linkType === 'code' ? '' : 'display:none;'}">
                    <button type="button" class="btn-sm btn-edit" onclick="saveSectionLinkSettings(${s.id})">حفظ</button>
                </div>
            </div>
        `;
    }).join('');
}

function onSectionLinkTypeChange(id) {
    const type = document.getElementById('secLinkType_' + id).value;
    document.getElementById('secExternalUrl_' + id).style.display = type === 'external' ? 'block' : 'none';
    document.getElementById('secAccessCode_' + id).style.display = type === 'code' ? 'block' : 'none';
}

async function saveSectionLinkSettings(id) {
    const linkType = document.getElementById('secLinkType_' + id).value;
    const externalUrl = document.getElementById('secExternalUrl_' + id).value.trim();
    const accessCode = document.getElementById('secAccessCode_' + id).value.trim();
    try {
        await saveSectionSetting(id, { linkType, externalUrl, accessCode });
        showToast('تم حفظ إعدادات القسم');
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ — تحقق من صلاحياتك', 'error');
    }
}

async function toggleSectionFree(id, isFree) {
    try {
        await saveSectionSetting(id, { free: isFree });
        showToast(isFree ? 'القسم أصبح مجانياً' : 'القسم أصبح مدفوعاً');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}

async function toggleSectionActive(id, isActive) {
    try {
        await saveSectionSetting(id, { active: isActive });
        showToast(isActive ? 'تم تفعيل القسم' : 'تم تعطيل القسم');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}


async function renderSubscriptionRequests() {
    const tbody = document.getElementById('subRequestsTableBody');
    if (!tbody) return;
    let snap;
    try { snap = await db.collection('subscriptionRequests').orderBy('createdAt', 'desc').limit(200).get(); adminClearError('subRequestsTableBody'); }
    catch (e) { adminShowError('subRequestsTableBody', e); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">تعذّر التحميل</td></tr>'; return; }
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(r => `
        <tr>
            <td>${r.userName || '-'}</td>
            <td>${r.userPhone || '-'}</td>
            <td>${r.sectionTitle || r.sectionId}</td>
            <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('ar-EG') : '-'}</td>
            <td><span class="badge ${r.status==='approved'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'}">${r.status==='approved'?'موافق':r.status==='rejected'?'مرفوض':'قيد الانتظار'}</span></td>
            <td>
                ${r.status==='pending' ? `
                <button class="btn-sm btn-view" onclick="approveSubscriptionRequest('${r.id}', '${r.userId}', ${r.sectionId})">موافقة</button>
                <button class="btn-sm btn-delete" onclick="rejectSubscriptionRequest('${r.id}')">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function approveSubscriptionRequest(reqId, userId, sectionId) {
    try {
        await db.collection('subscriptionRequests').doc(reqId).update({ status: 'approved' });
        // فتح القسم فعلياً في ملف المستخدم
        await db.collection('users').doc(userId).update({
            allowedSections: firebase.firestore.FieldValue.arrayUnion(sectionId)
        });
        await db.collection('notifications').add({
            userId, message: 'تم تفعيل اشتراكك بالقسم المطلوب', read: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await renderSubscriptionRequests();
        showToast('تمت الموافقة وفتح القسم للمستخدم');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}

async function rejectSubscriptionRequest(reqId) {
    try {
        await db.collection('subscriptionRequests').doc(reqId).update({ status: 'rejected' });
        await renderSubscriptionRequests();
        showToast('تم رفض الطلب');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}

async function renderAccessRequests() {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    let snap;
    try { snap = await db.collection('accessRequests').orderBy('createdAt', 'desc').limit(200).get(); adminClearError('requestsTableBody'); }
    catch (e) { adminShowError('requestsTableBody', e); tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">تعذّر التحميل</td></tr>'; return; }
    const list = [];
    snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));

    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طلبات</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(r => `
        <tr>
            <td>${r.userName || '-'}</td>
            <td>${r.userEmail || '-'}</td>
            <td>${r.lectureTitle || r.lectureId}</td>
            <td>${r.createdAt && r.createdAt.toDate ? r.createdAt.toDate().toLocaleString('ar-EG') : '-'}</td>
            <td><span class="badge ${r.status==='approved'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'}">${r.status==='approved'?'موافق':r.status==='rejected'?'مرفوض':'قيد الانتظار'}</span></td>
            <td>
                ${r.status==='pending' ? `
                <button class="btn-sm btn-view" onclick="approveRequest('${r.id}')">موافقة</button>
                <button class="btn-sm btn-delete" onclick="rejectRequest('${r.id}')">رفض</button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

async function approveRequest(reqId) {
    try {
        await db.collection('accessRequests').doc(reqId).update({ status: 'approved' });
        await renderAccessRequests();
        showToast('تمت الموافقة على الطلب');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}

async function rejectRequest(reqId) {
    try {
        await db.collection('accessRequests').doc(reqId).update({ status: 'rejected' });
        await renderAccessRequests();
        showToast('تم رفض الطلب');
    } catch (e) {
        console.error(e);
        showToast('فشلت العملية', 'error');
    }
}


/* ========== طرق الدفع ========== */
function renderPayMethods() {
    var tbody = document.getElementById('payMethodsTableBody');
    if (!tbody) return;
    var list = getPaymentMethods().slice().sort(function(a,b){ return (a.order||0) - (b.order||0); });
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد طرق دفع — أضف واحدة</td></tr>';
        return;
    }
    var typeNames = { paymob: 'Paymob', wallet: 'محفظة', bank: 'بنك', manual: 'يدوي' };
    tbody.innerHTML = list.map(function(m) {
        return '<tr>' +
            '<td>' + (m.order || '-') + '</td>' +
            '<td><i class="fas ' + (m.icon||'fa-wallet') + '"></i> ' + m.name + '</td>' +
            '<td>' + (typeNames[m.type] || m.type) + '</td>' +
            '<td>' + (m.accountInfo || '—') + '</td>' +
            '<td><span class="badge ' + (m.active ? 'badge-success' : 'badge-danger') + '">' + (m.active ? 'مفعّل' : 'معطّل') + '</span></td>' +
            '<td>' +
            '<button class="btn-sm btn-view" onclick="editPayMethod(\'' + m.id + '\')">تعديل</button> ' +
            '<button class="btn-sm" onclick="togglePayMethod(\'' + m.id + '\')">' + (m.active ? 'تعطيل' : 'تفعيل') + '</button> ' +
            '<button class="btn-sm btn-delete" onclick="deletePayMethod(\'' + m.id + '\')">حذف</button>' +
            '</td></tr>';
    }).join('');
}

function openPayMethodModal(editId) {
    document.getElementById('pmEditId').value = editId || '';
    document.getElementById('payMethodModalTitle').textContent = editId ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع';
    if (!editId) {
        document.getElementById('pmName').value = '';
        document.getElementById('pmType').value = 'wallet';
        document.getElementById('pmIcon').value = 'fa-wallet';
        document.getElementById('pmAccount').value = '';
        document.getElementById('pmInstructions').value = '';
        document.getElementById('pmOrder').value = '10';
        document.getElementById('pmActive').checked = true;
    }
    document.getElementById('payMethodModal').classList.add('active');
}

function editPayMethod(id) {
    var m = getPaymentMethods().find(function(x){ return x.id === id; });
    if (!m) return;
    document.getElementById('pmEditId').value = m.id;
    document.getElementById('payMethodModalTitle').textContent = 'تعديل طريقة دفع';
    document.getElementById('pmName').value = m.name || '';
    document.getElementById('pmType').value = m.type || 'wallet';
    document.getElementById('pmIcon').value = m.icon || 'fa-wallet';
    document.getElementById('pmAccount').value = m.accountInfo || '';
    document.getElementById('pmInstructions').value = m.instructions || '';
    document.getElementById('pmOrder').value = m.order || 10;
    document.getElementById('pmActive').checked = !!m.active;
    document.getElementById('payMethodModal').classList.add('active');
}

function savePayMethod(event) {
    event.preventDefault();
    var editId = document.getElementById('pmEditId').value;
    var name = document.getElementById('pmName').value.trim();
    if (!name) { showToast('أدخل الاسم', 'error'); return; }
    var list = getPaymentMethods();
    var data = {
        id: editId || ('pm_' + Date.now()),
        name: name,
        type: document.getElementById('pmType').value,
        icon: document.getElementById('pmIcon').value.trim() || 'fa-wallet',
        accountInfo: document.getElementById('pmAccount').value.trim(),
        instructions: document.getElementById('pmInstructions').value.trim(),
        order: parseInt(document.getElementById('pmOrder').value, 10) || 10,
        active: document.getElementById('pmActive').checked
    };
    if (editId) {
        list = list.map(function(m){ return m.id === editId ? data : m; });
    } else {
        list.push(data);
    }
    savePaymentMethods(list);
    document.getElementById('payMethodModal').classList.remove('active');
    renderPayMethods();
    showToast('تم حفظ طريقة الدفع');
}

function togglePayMethod(id) {
    var list = getPaymentMethods().map(function(m){
        if (m.id === id) m.active = !m.active;
        return m;
    });
    savePaymentMethods(list);
    renderPayMethods();
    showToast('تم تحديث الحالة');
}

function deletePayMethod(id) {
    if (!confirm('حذف طريقة الدفع؟')) return;
    var list = getPaymentMethods().filter(function(m){ return m.id !== id; });
    savePaymentMethods(list);
    renderPayMethods();
    showToast('تم الحذف');
}


// ========== محتوى الصفحة الرئيسية (يتحكم في index.html + زر التواصل العائم) ==========
const SITE_CONTENT_SCHEMA = [
    { title: 'الهيرو (أول الصفحة)', fields: [
        { k: 'home.heroTitle', label: 'العنوان الرئيسي', ph: 'معنى لكل حكاية' },
        { k: 'home.heroLead', label: 'النص التعريفي', ph: 'منصة عربية للصحة النفسية والروحية...', area: true },
        { k: 'home.cta1Text', label: 'نص الزر الأول', ph: 'احجز جلسة نفسية' },
        { k: 'home.cta1Link', label: 'رابط الزر الأول', ph: 'psych-session.html' },
        { k: 'home.cta2Text', label: 'نص الزر الثاني', ph: 'ابدأ رحلتك' },
        { k: 'home.cta2Link', label: 'رابط الزر الثاني', ph: 'register.html' }
    ]},
    { title: 'بانر التحقق من الشهادة', fields: [
        { k: 'home.verifyTitle', label: 'العنوان', ph: 'التحقق من صحة الشهادة' },
        { k: 'home.verifyDesc', label: 'الوصف', ph: 'أدخل كود الشهادة (ID) ...' }
    ]},
    { title: 'أزرار الأقسام', paths: [
        ['sessions', 'أطباء الجلسات'], ['spiritual', 'الصحة النفسية والروحية'], ['skills', 'تنمية المهارات'],
        ['vignettes', 'حالات سريرية'], ['tests', 'الاختبارات النفسية']
    ]},
    { title: 'زر المحاضرات (المستطيل)', fields: [
        { k: 'home.lecturesShow', label: 'إظهار الزر', bool: true },
        { k: 'home.lecturesTitle', label: 'العنوان', ph: 'المحاضرات' },
        { k: 'home.lecturesDesc', label: 'الوصف', ph: 'محاضرات متخصصة موثّقة بكود دخول...' },
        { k: 'home.lecturesLink', label: 'الرابط', ph: 'online-lectures.html' }
    ]},
    { title: 'روابط التواصل (الزر العائم)', fields: [
        { k: 'social_whatsapp', label: 'واتساب (ثابت: 01152013172 — لا يتأثر بهذه الخانة)', ph: 'https://wa.me/201152013172' },
        { k: 'social_facebook', label: 'فيسبوك', ph: 'https://facebook.com/...' },
        { k: 'social_instagram', label: 'إنستجرام', ph: 'https://instagram.com/...' },
        { k: 'social_tiktok', label: 'تيك توك', ph: 'https://tiktok.com/@...' },
        { k: 'social_youtube', label: 'يوتيوب', ph: 'https://youtube.com/@...' }
    ]}
];

function _scEsc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

function renderSiteContentForm() {
    const wrap = document.getElementById('siteContentWrap');
    if (!wrap) return;
    const st = getSettings();
    const field = f => {
        const v = st[f.k.replace('.', '_')];
        if (f.bool) {
            return `<label class="sc-check"><input type="checkbox" data-sc="${f.k}" ${v === false ? '' : 'checked'}> ${f.label}</label>`;
        }
        const input = f.area
            ? `<textarea data-sc="${f.k}" rows="3" placeholder="${_scEsc(f.ph)}">${_scEsc(v)}</textarea>`
            : `<input type="text" data-sc="${f.k}" value="${_scEsc(v)}" placeholder="${_scEsc(f.ph)}">`;
        return `<div class="form-group"><label>${f.label}</label>${input}</div>`;
    };
    wrap.innerHTML = '<form onsubmit="saveSiteContent(event)">' + SITE_CONTENT_SCHEMA.map(g => {
        let body = '';
        if (g.fields) body = g.fields.map(field).join('');
        if (g.paths) body = g.paths.map(([key, name]) => `
            <div class="sc-path"><strong>${name}</strong>
                ${field({ k: 'home.path_' + key + '_show', label: 'إظهار', bool: true })}
                ${field({ k: 'home.path_' + key + '_title', label: 'العنوان', ph: name })}
                ${field({ k: 'home.path_' + key + '_desc', label: 'الوصف', ph: '' })}
                ${field({ k: 'home.path_' + key + '_link', label: 'الرابط', ph: '' })}
            </div>`).join('');
        return `<div class="sc-card"><h3>${g.title}</h3>${body}</div>`;
    }).join('') + '<button type="submit" class="form-submit sc-save"><i class="fas fa-floppy-disk"></i> حفظ ونشر</button></form>';
}

function saveSiteContent(event) {
    event.preventDefault();
    const patch = {};
    document.querySelectorAll('#siteContentWrap [data-sc]').forEach(el => {
        const k = el.getAttribute('data-sc');
        patch[k.replace('.', '_')] = el.type === 'checkbox' ? el.checked : el.value.trim();
    });
    saveSettings(patch);
    showToast('تم حفظ المحتوى — بيظهر فورًا في الصفحة الرئيسية');
}
