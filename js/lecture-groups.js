/* ============================================================
   منصة "المحاضرات المتخصصة" — 3 أقسام، كل قسم مجموعة محاضرات محمية ب ID
   يستخدم نفس Firebase الموجود في المشروع (js/firebase-config.js)
   ولا يعتمد على أي مشروع أو نظام مصادقة منفصل.
   ============================================================ */

function lgNormalizeName(n) { return (n || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

function lgDefaultGroups() {
    return [
        { id: 'lg-1', name: 'القسم الأول', img1: '', img2: '', order: 1 },
        { id: 'lg-2', name: 'القسم الثاني', img1: '', img2: '', order: 2 },
        { id: 'lg-3', name: 'القسم الثالث', img1: '', img2: '', order: 3 },
    ];
}
function lgDefaultItems() {
    const list = [];
    lgDefaultGroups().forEach((g, gi) => {
        for (let i = 1; i <= 10; i++) {
            list.push({
                id: `${g.id}-L${i}`, groupId: g.id, title: `المحاضرة ${i}`, description: '',
                thumbnail: '', mediaType: 'video-file', mediaUrl: '',
                accessCode: String(100 * (gi + 1) + i), viewLimit: 3, order: i,
            });
        }
    });
    return list;
}

function lgGetEmbedUrl(mediaType, url) {
    if (mediaType === 'youtube') {
        const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
        return m ? `https://www.youtube.com/embed/${m[1]}` : '';
    }
    if (mediaType === 'vimeo') {
        const m = (url || '').match(/vimeo\.com\/(\d+)/);
        return m ? `https://player.vimeo.com/video/${m[1]}` : '';
    }
    return url || '';
}

async function lgFetchPublicState() {
    const [gSnap, iSnap, settingsDoc] = await Promise.all([
        db.collection('lectureGroups').get(),
        db.collection('lectureGroupItems').get(),
        db.collection('settings').doc('lecturePlatform').get(),
    ]);
    const groups = gSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    const items = iSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    const whatsappNumber = settingsDoc.exists ? (settingsDoc.data().whatsappNumber || '') : '';
    return { groups, items, whatsappNumber };
}

async function lgRegister(name, itemId, code) {
    const itemRef = db.collection('lectureGroupItems').doc(itemId);
    const itemDoc = await itemRef.get();
    if (!itemDoc.exists) return { ok: false, error: 'المحاضرة غير موجودة.' };
    const item = itemDoc.data();
    if (!item.mediaUrl) return { ok: false, error: 'لم يتم إضافة رابط هذه المحاضرة بعد من الإدارة.' };
    if (String(code).trim() !== String(item.accessCode)) return { ok: false, error: 'رقم ID المحاضرة غير صحيح.' };

    const viewId = `${itemId}__${lgNormalizeName(name)}`;
    const viewRef = db.collection('lectureGroupViews').doc(viewId);
    const viewDoc = await viewRef.get();
    const count = viewDoc.exists ? (viewDoc.data().viewCount || 0) : 0;
    const limit = Number(item.viewLimit) || 1;
    if (count >= limit) {
        return { ok: false, error: `لقد استنفذت عدد المرات المسموح بها لعرض هذه المحاضرة (${limit}).` };
    }
    await viewRef.set({ name: name.trim(), itemId, groupId: item.groupId, viewCount: count + 1, lastAccess: new Date().toISOString() });
    return { ok: true, title: item.title, description: item.description, mediaType: item.mediaType, mediaUrl: item.mediaUrl };
}

/* ================= الواجهة العامة (lectures.html) ================= */
let lgState = { groups: [], items: [], whatsappNumber: '', activeGroupId: null };

async function lgInitPublic() {
    const grid = document.getElementById('lectureGroupsGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        lgState = { ...(await lgFetchPublicState()), activeGroupId: null };
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">تعذّر تحميل الأقسام حالياً.</p>';
        return;
    }
    lgRenderGroups();
}

function lgRenderGroups() {
    const grid = document.getElementById('lectureGroupsGrid');
    const itemsWrap = document.getElementById('lectureItemsWrap');
    if (!grid) return;
    grid.style.display = 'grid';
    if (itemsWrap) itemsWrap.style.display = 'none';

    if (!lgState.groups.length) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">لا توجد أقسام محاضرات متاحة حالياً.</p>';
        return;
    }
    grid.innerHTML = lgState.groups.map(g => {
        const count = lgState.items.filter(i => i.groupId === g.id).length;
        return `
        <button type="button" class="section-card fade-in lg-group-card" onclick="lgOpenGroup('${g.id}')" style="text-align:right;cursor:pointer;width:100%;">
            <div class="lg-cover" data-img1="${(g.img1 || '').replace(/"/g, '&quot;')}" data-img2="${(g.img2 || '').replace(/"/g, '&quot;')}">
                ${g.img1 ? `<img src="${g.img1}" alt="${g.name}" class="lg-cover-img active">` : ''}
                ${g.img2 ? `<img src="${g.img2}" alt="${g.name}" class="lg-cover-img">` : ''}
                ${!g.img1 && !g.img2 ? '<div class="lg-cover-placeholder"><i class="fas fa-book-open"></i></div>' : ''}
            </div>
            <div class="section-body">
                <h3 style="margin:0 0 4px;">${g.name}</h3>
                <p style="color:var(--text-muted);font-size:0.85rem;margin:0;">${count} محاضرة</p>
            </div>
        </button>`;
    }).join('');

    grid.querySelectorAll('.lg-cover').forEach(cover => {
        const imgs = cover.querySelectorAll('.lg-cover-img');
        if (imgs.length < 2) return;
        let show1 = true;
        setInterval(() => {
            show1 = !show1;
            imgs[0].classList.toggle('active', show1);
            imgs[1].classList.toggle('active', !show1);
        }, 3000);
    });
}

function lgOpenGroup(groupId) {
    lgState.activeGroupId = groupId;
    const grid = document.getElementById('lectureGroupsGrid');
    const itemsWrap = document.getElementById('lectureItemsWrap');
    if (grid) grid.style.display = 'none';
    if (!itemsWrap) return;
    itemsWrap.style.display = 'block';

    const group = lgState.groups.find(g => g.id === groupId);
    const items = lgState.items.filter(i => i.groupId === groupId);
    const titleEl = document.getElementById('lgGroupTitle');
    if (titleEl) titleEl.textContent = group ? group.name : '';

    const itemsGrid = document.getElementById('lgItemsGrid');
    if (itemsGrid) {
        itemsGrid.innerHTML = items.length ? items.map((it, i) => `
            <button type="button" class="lecture-card fade-in" style="text-align:right;cursor:pointer;width:100%;border:none;" onclick='lgOpenLogin(${JSON.stringify(it.id)})'>
                <div class="lecture-thumb" style="position:relative;height:120px;overflow:hidden;border-radius:12px 12px 0 0;">
                    ${it.thumbnail ? `<img src="${it.thumbnail}" alt="${it.title}" style="width:100%;height:100%;object-fit:cover;">` : '<div class="lg-cover-placeholder" style="height:100%;"><i class="fas fa-play-circle"></i></div>'}
                    <span style="position:absolute;top:8px;left:8px;background:rgba(23,98,77,.85);color:#fff;font-size:11px;padding:2px 8px;border-radius:999px;">${i + 1}</span>
                    <span style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:4px 8px;border-radius:999px;"><i class="fas fa-lock"></i> محمي</span>
                </div>
                <div class="lecture-body" style="padding:12px;">
                    <h3 style="margin:0 0 4px;font-size:0.95rem;">${it.title}</h3>
                    ${it.description ? `<p style="font-size:0.8rem;color:var(--text-muted);margin:0;">${it.description}</p>` : ''}
                </div>
            </button>`).join('') : '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">لا توجد محاضرات في هذا القسم بعد.</p>';
    }
}

function lgBackToGroups() {
    lgState.activeGroupId = null;
    lgRenderGroups();
}

function lgOpenLogin(itemId) {
    const item = lgState.items.find(i => i.id === itemId);
    if (!item) return;
    const modal = document.getElementById('lgLoginModal');
    if (!modal) return;
    modal.dataset.itemId = itemId;
    const titleEl = document.getElementById('lgLoginTitle');
    if (titleEl) titleEl.textContent = item.title;
    const errBox = document.getElementById('lgLoginError');
    if (errBox) errBox.style.display = 'none';
    document.getElementById('lgLoginName').value = '';
    document.getElementById('lgLoginCode').value = '';
    modal.classList.add('active');
}

function lgCloseLogin() {
    const modal = document.getElementById('lgLoginModal');
    if (modal) modal.classList.remove('active');
}

async function lgSubmitLogin(event) {
    event.preventDefault();
    const modal = document.getElementById('lgLoginModal');
    const itemId = modal ? modal.dataset.itemId : null;
    const name = document.getElementById('lgLoginName').value.trim();
    const code = document.getElementById('lgLoginCode').value.trim();
    const errBox = document.getElementById('lgLoginError');
    if (!itemId || !name || !code) return;

    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }

    try {
        const res = await lgRegister(name, itemId, code);
        if (!res.ok) {
            if (errBox) { errBox.textContent = res.error || 'حدث خطأ.'; errBox.style.display = 'block'; }
            return;
        }
        lgCloseLogin();
        lgOpenPlayer({ ...res, userName: name });
    } catch (e) {
        console.error(e);
        if (errBox) { errBox.textContent = 'تعذّر الاتصال، حاول مرة أخرى.'; errBox.style.display = 'block'; }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset.orig; }
    }
}

function lgOpenPlayer(content) {
    const modal = document.getElementById('lgPlayerModal');
    if (!modal) return;
    document.getElementById('lgPlayerTitle').textContent = content.title || '';
    document.getElementById('lgPlayerGreeting').textContent = content.userName ? `أهلاً ${content.userName} — استمتع بالمحاضرة` : '';
    const desc = document.getElementById('lgPlayerDesc');
    if (desc) desc.textContent = content.description || '';

    const embed = lgGetEmbedUrl(content.mediaType, content.mediaUrl);
    const holder = document.getElementById('lgPlayerHolder');
    if (holder) {
        if (content.mediaType === 'audio-file') {
            holder.innerHTML = `<audio controls style="width:100%;" src="${embed}"></audio>`;
        } else if (content.mediaType === 'video-file') {
            holder.innerHTML = `<video controls playsinline style="width:100%;max-height:60vh;background:#000;" src="${embed}"></video>`;
        } else if (embed) {
            holder.innerHTML = `<div style="position:relative;padding-top:56.25%;"><iframe src="${embed}" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe></div>`;
        } else {
            holder.innerHTML = '<p style="padding:24px;text-align:center;">تعذّر تحميل الرابط.</p>';
        }
    }
    modal.classList.add('active');
}
function lgClosePlayer() {
    const modal = document.getElementById('lgPlayerModal');
    if (modal) modal.classList.remove('active');
    const holder = document.getElementById('lgPlayerHolder');
    if (holder) holder.innerHTML = '';
}

function lgOpenRequestId() {
    const group = lgState.groups.find(g => g.id === lgState.activeGroupId);
    const modal = document.getElementById('lgRequestModal');
    if (!modal) return;
    document.getElementById('lgRequestGroupName').textContent = group ? group.name : '';
    document.getElementById('lgRequestName').value = '';
    document.getElementById('lgRequestPhone').value = '';
    const errBox = document.getElementById('lgRequestError');
    if (errBox) errBox.style.display = 'none';
    modal.classList.add('active');
}
function lgCloseRequestId() {
    const modal = document.getElementById('lgRequestModal');
    if (modal) modal.classList.remove('active');
}
function lgSubmitRequestId(event) {
    event.preventDefault();
    const group = lgState.groups.find(g => g.id === lgState.activeGroupId);
    const name = document.getElementById('lgRequestName').value.trim();
    const phone = document.getElementById('lgRequestPhone').value.trim();
    const errBox = document.getElementById('lgRequestError');
    if (!name || !phone) {
        if (errBox) { errBox.textContent = 'من فضلك أدخل الاسم ورقم الهاتف.'; errBox.style.display = 'block'; }
        return;
    }
    const text = `طلب جلب ID القسم\nالاسم: ${name}\nرقم الهاتف: ${phone}\nالقسم المطلوب: ${group ? group.name : ''}`;
    window.open(`https://wa.me/${SITE_CONTACT.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
    lgCloseRequestId();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lectureGroupsGrid')) lgInitPublic();
});

/* ================= لوحة الإدارة (admin.html) ================= */
let lgAdminData = null;
let lgAdminActiveGroup = null;

async function renderAdminLectureGroups() {
    const wrap = document.getElementById('lgAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        const [gSnap, iSnap, vSnap, sDoc] = await Promise.all([
            db.collection('lectureGroups').get(),
            db.collection('lectureGroupItems').get(),
            db.collection('lectureGroupViews').get(),
            db.collection('settings').doc('lecturePlatform').get(),
        ]);
        lgAdminData = {
            groups: gSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)),
            items: iSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            views: vSnap.docs.map(d => ({ id: d.id, ...d.data() })),
            whatsappNumber: sDoc.exists ? (sDoc.data().whatsappNumber || '') : '',
        };
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<p style="color:var(--admin-text-muted);">تعذّر تحميل البيانات.</p>';
        return;
    }
    if (!lgAdminActiveGroup && lgAdminData.groups.length) lgAdminActiveGroup = lgAdminData.groups[0].id;
    lgRenderAdmin();
}

async function lgSeedDefaults() {
    if (!confirm('سيتم إنشاء 3 أقسام و30 محاضرة افتراضية يمكن تعديلها لاحقاً. متابعة؟')) return;
    const batch = db.batch();
    lgDefaultGroups().forEach(g => { const { id, ...rest } = g; batch.set(db.collection('lectureGroups').doc(id), rest); });
    lgDefaultItems().forEach(it => { const { id, ...rest } = it; batch.set(db.collection('lectureGroupItems').doc(id), rest); });
    batch.set(db.collection('settings').doc('lecturePlatform'), { whatsappNumber: '' }, { merge: true });
    await batch.commit();
    showToast('تم إنشاء البيانات الافتراضية');
    renderAdminLectureGroups();
}

function lgRenderAdmin() {
    const wrap = document.getElementById('lgAdminWrap');
    if (!wrap || !lgAdminData) return;

    if (!lgAdminData.groups.length) {
        wrap.innerHTML = `
            <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:24px;text-align:center;">
                <p style="color:var(--admin-text-muted);margin-bottom:14px;">لا توجد أقسام بعد. أنشئ 3 أقسام و30 محاضرة افتراضية بضغطة واحدة، ثم عدّلها كما تريد.</p>
                <button type="button" class="form-submit" onclick="lgSeedDefaults()" style="width:auto;padding:10px 24px;">إنشاء البيانات الافتراضية</button>
            </div>`;
        return;
    }

    const tabsHtml = lgAdminData.groups.map(g => `
        <button type="button" class="btn-outline ol-admin-tab ${lgAdminActiveGroup === g.id ? 'active' : ''}" onclick="lgAdminSelectGroup('${g.id}')">${g.name}</button>`).join('');

    const group = lgAdminData.groups.find(g => g.id === lgAdminActiveGroup) || lgAdminData.groups[0];
    const items = lgAdminData.items.filter(i => i.groupId === group.id).sort((a, b) => (a.order || 0) - (b.order || 0));

    const itemsHtml = items.map(it => `
        <details style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;">
            <summary style="padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;">
                <span>${it.title}</span>
                <span style="color:var(--admin-text-muted);font-size:12px;">ID: ${it.accessCode}</span>
            </summary>
            <form onsubmit="lgSaveItem(event, '${it.id}')" style="padding:0 16px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group"><label>عنوان المحاضرة</label><input type="text" name="title" value="${(it.title || '').replace(/"/g, '&quot;')}" required></div>
                <div class="form-group"><label>ID المحاضرة (كود الدخول)</label><input type="text" name="accessCode" value="${it.accessCode || ''}" required></div>
                <div class="form-group"><label>رابط الصورة المصغرة</label><input type="text" name="thumbnail" value="${(it.thumbnail || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div class="form-group"><label>نوع الوسائط</label>
                    <select name="mediaType">
                        <option value="video-file" ${it.mediaType === 'video-file' ? 'selected' : ''}>فيديو (ملف مباشر)</option>
                        <option value="audio-file" ${it.mediaType === 'audio-file' ? 'selected' : ''}>صوت (ملف مباشر)</option>
                        <option value="youtube" ${it.mediaType === 'youtube' ? 'selected' : ''}>يوتيوب</option>
                        <option value="vimeo" ${it.mediaType === 'vimeo' ? 'selected' : ''}>Vimeo</option>
                        <option value="iframe" ${it.mediaType === 'iframe' ? 'selected' : ''}>رابط تضمين آخر</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column:1/-1;"><label>رابط المحاضرة (فيديو/صوت/يوتيوب/فيميو)</label><input type="text" name="mediaUrl" value="${(it.mediaUrl || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div class="form-group" style="grid-column:1/-1;"><label>الشرح / الوصف</label><textarea name="description" rows="2">${it.description || ''}</textarea></div>
                <div class="form-group"><label>عدد مرات السماح بالعرض</label><input type="number" name="viewLimit" min="1" value="${it.viewLimit || 1}"></div>
                <div class="form-group" style="align-self:end;"><button type="submit" class="form-submit">حفظ المحاضرة</button></div>
            </form>
        </details>`).join('');

    wrap.innerHTML = `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">${tabsHtml}</div>
        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">بيانات القسم</h3>
            <form onsubmit="lgSaveGroup(event, '${group.id}')" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                <div class="form-group"><label>اسم القسم</label><input type="text" name="name" value="${(group.name || '').replace(/"/g, '&quot;')}" required></div>
                <div class="form-group"><label>رابط صورة الغلاف 1</label><input type="text" name="img1" value="${(group.img1 || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div class="form-group"><label>رابط صورة الغلاف 2</label><input type="text" name="img2" value="${(group.img2 || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ بيانات القسم</button></div>
            </form>
        </div>
        <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">محاضرات القسم (${items.length})</h3>
        ${itemsHtml || '<p style="color:var(--admin-text-muted);">لا توجد محاضرات في هذا القسم.</p>'}

        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-top:24px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">رقم واتساب استقبال طلبات ID الأقسام</h3>
            <form onsubmit="lgSaveWhatsapp(event)">
                <div class="form-group"><label>الرقم (بصيغة دولية بدون + مثال: 201152013172)</label><input type="text" id="lgWhatsappInput" value="${lgAdminData.whatsappNumber || ''}" placeholder="201152013172"></div>
                <button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ الرقم</button>
            </form>
        </div>

        <h3 style="color:var(--admin-text);margin:24px 0 14px;font-size:1rem;">المسجّلون في محاضرات هذا القسم</h3>
        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead><tr style="color:var(--admin-text-muted);text-align:right;">
                    <th style="padding:10px;">الاسم</th><th style="padding:10px;">المحاضرة</th><th style="padding:10px;">عدد المشاهدات</th><th style="padding:10px;">آخر دخول</th><th style="padding:10px;"></th>
                </tr></thead>
                <tbody>
                ${lgAdminData.views.filter(v => v.groupId === group.id).map(v => {
                    const it = lgAdminData.items.find(i => i.id === v.itemId);
                    return `<tr style="border-top:1px solid var(--admin-border);color:var(--admin-text);">
                        <td style="padding:10px;">${v.name}</td>
                        <td style="padding:10px;color:var(--admin-text-muted);">${it ? it.title : '—'}</td>
                        <td style="padding:10px;">${v.viewCount || 0} / ${it ? it.viewLimit : '-'}</td>
                        <td style="padding:10px;color:var(--admin-text-muted);">${v.lastAccess ? new Date(v.lastAccess).toLocaleString('ar-EG') : '-'}</td>
                        <td style="padding:10px;display:flex;gap:8px;">
                            <button type="button" title="تصفير العداد" class="btn-outline" style="padding:4px 8px;" onclick="lgResetView('${v.id}')"><i class="fas fa-rotate-left"></i></button>
                            <button type="button" title="حذف" class="btn-outline" style="padding:4px 8px;color:#e05656;" onclick="lgDeleteView('${v.id}')"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
                }).join('') || `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--admin-text-muted);">لا يوجد مسجّلون بعد.</td></tr>`}
                </tbody>
            </table>
        </div>`;
}

function lgAdminSelectGroup(groupId) {
    lgAdminActiveGroup = groupId;
    lgRenderAdmin();
}

async function lgSaveGroup(event, groupId) {
    event.preventDefault();
    const f = event.target;
    const patch = { name: f.name.value.trim(), img1: f.img1.value.trim(), img2: f.img2.value.trim() };
    await db.collection('lectureGroups').doc(groupId).set(patch, { merge: true });
    showToast('تم حفظ بيانات القسم');
    renderAdminLectureGroups();
}

async function lgSaveItem(event, itemId) {
    event.preventDefault();
    const f = event.target;
    const patch = {
        title: f.title.value.trim(),
        accessCode: f.accessCode.value.trim(),
        thumbnail: f.thumbnail.value.trim(),
        mediaType: f.mediaType.value,
        mediaUrl: f.mediaUrl.value.trim(),
        description: f.description.value.trim(),
        viewLimit: Math.max(1, Number(f.viewLimit.value) || 1),
    };
    await db.collection('lectureGroupItems').doc(itemId).set(patch, { merge: true });
    showToast('تم حفظ المحاضرة');
    renderAdminLectureGroups();
}

async function lgSaveWhatsapp(event) {
    event.preventDefault();
    const num = document.getElementById('lgWhatsappInput').value.trim();
    await db.collection('settings').doc('lecturePlatform').set({ whatsappNumber: num }, { merge: true });
    showToast('تم حفظ رقم واتساب');
}

async function lgResetView(viewId) {
    await db.collection('lectureGroupViews').doc(viewId).set({ viewCount: 0 }, { merge: true });
    showToast('تم تصفير العداد');
    renderAdminLectureGroups();
}
async function lgDeleteView(viewId) {
    if (!confirm('حذف هذا التسجيل؟')) return;
    await db.collection('lectureGroupViews').doc(viewId).delete();
    showToast('تم الحذف');
    renderAdminLectureGroups();
}
