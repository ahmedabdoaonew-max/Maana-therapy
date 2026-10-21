/* ============================================================
   بودكاست معنى — الصفحة العامة + لوحة الإدارة
   Firestore:
     podcastCategories/{id}      الأقسام الفرعية
     podcastEpisodes/{id}        بيانات الحلقة (بدون رابط الملف)
     podcastMedia/{id}           رابط الملف (محمي بالقواعد: مجانية أو مفتوحة للمستخدم فقط)
     podcastAccess/{uid_epId}    صلاحية فتح حلقة لمستخدم (تمنحها الإدارة)
     podcastRequests/{uid_epId}  طلبات فتح الحلقات
   الحلقات بتتضاف كرابط (يوتيوب / درايف / رابط مباشر) والأغلفة صور صغيرة داخل Firestore — بدون Storage.
   ============================================================ */

function pcEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}
function pcDur(sec) {
    sec = Number(sec) || 0;
    if (!sec) return '';
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return h + ' س ' + m + ' د';
    if (m) return m + ' د';
    return s + ' ث';
}
/** مسار نسبي داخل المشروع (media/...) أو رابط كامل */
function pcValidMedia(u) { return /^https?:\/\//i.test(u) || /^(\.\/)?[A-Za-z0-9_\-\/. %()+]+\.(mp3|m4a|wav|ogg|aac|mp4|webm|mov)$/i.test(u); }
function pcWA() { return (window.SITE_CONTACT && SITE_CONTACT.whatsapp) || '201152013172'; }
function pcTs(e) { return Number(e.createdAtMs) || 0; }

/* ======================= الصفحة العامة ======================= */
var pcState = { cats: [], eps: [], active: 'all', access: new Set(), pending: new Set(), uid: null, loaded: false };
var pcUnsubAccess = null, pcUnsubReq = null;

async function pcInitPublic() {
    var list = document.getElementById('pcList');
    if (!list) return;
    list.innerHTML = '<p class="pc-empty"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        var res = await Promise.all([
            db.collection('podcastCategories').get(),
            db.collection('podcastEpisodes').get()
        ]);
        pcState.cats = res[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        pcState.eps = res[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
            .filter(function (e) { return e.published !== false; })
            .sort(function (a, b) { return (a.order || 0) - (b.order || 0) || pcTs(b) - pcTs(a); });
        pcState.loaded = true;
    } catch (e) {
        console.error(e);
        list.innerHTML = '<p class="pc-empty">تعذّر تحميل الحلقات حالياً. حاول مرة أخرى بعد قليل.</p>';
        return;
    }
    var hash = decodeURIComponent((location.hash || '').replace('#', ''));
    if (hash && pcState.cats.some(function (c) { return c.id === hash; })) pcState.active = hash;
    pcRender();

    auth.onAuthStateChanged(function (u) {
        pcState.uid = u ? u.uid : null;
        if (pcUnsubAccess) { pcUnsubAccess(); pcUnsubAccess = null; }
        if (pcUnsubReq) { pcUnsubReq(); pcUnsubReq = null; }
        pcState.access = new Set(); pcState.pending = new Set();
        if (u) {
            pcUnsubAccess = db.collection('podcastAccess').where('userId', '==', u.uid).onSnapshot(function (s) {
                pcState.access = new Set(s.docs.map(function (d) { return d.data().episodeId; }));
                pcRender();
            }, function () {});
            pcUnsubReq = db.collection('podcastRequests').where('userId', '==', u.uid).onSnapshot(function (s) {
                pcState.pending = new Set(s.docs.filter(function (d) { return d.data().status === 'pending'; })
                    .map(function (d) { return d.data().episodeId; }));
                pcRender();
            }, function () {});
        }
        pcRender();
    });
}

function pcIsOpen(ep) { return ep.openToAll === true || pcState.access.has(ep.id); }
function pcCatName(id) {
    var c = pcState.cats.find(function (x) { return x.id === id; });
    return c ? c.name : '';
}

function pcRender() {
    if (!pcState.loaded) return;
    pcRenderFeatured();
    pcRenderTabs();
    pcRenderList();
}

function pcRenderFeatured() {
    var box = document.getElementById('pcFeatured');
    if (!box) return;
    var eps = pcState.eps.slice().sort(function (a, b) { return pcTs(b) - pcTs(a); });
    var ep = eps[0];
    if (!ep) { box.innerHTML = ''; return; }
    var open = pcIsOpen(ep);
    box.innerHTML =
        '<button type="button" class="pc-feat" onclick="pcOpen(\'' + ep.id + '\')">' +
            '<span class="pc-feat-cover">' + (ep.coverUrl ? '<img src="' + pcEsc(ep.coverUrl) + '" alt="">' : '<i class="fas fa-microphone-lines"></i>') + '</span>' +
            '<span class="pc-feat-txt">' +
                '<small>أحدث حلقة</small>' +
                '<strong>' + pcEsc(ep.title) + '</strong>' +
                '<em>' + (open ? '<i class="fas fa-play"></i> استمع الآن' : '<i class="fab fa-whatsapp"></i> طلب سماع') + '</em>' +
            '</span>' +
        '</button>';
}

function pcRenderTabs() {
    var wrap = document.getElementById('pcTabs');
    if (!wrap) return;
    var counts = {};
    pcState.eps.forEach(function (e) { counts[e.categoryId] = (counts[e.categoryId] || 0) + 1; });
    var html = '<button type="button" class="pc-tab' + (pcState.active === 'all' ? ' on' : '') + '" onclick="pcSetCat(\'all\')">كل الحلقات <b>' + pcState.eps.length + '</b></button>';
    pcState.cats.forEach(function (c) {
        if (!counts[c.id]) return;
        html += '<button type="button" class="pc-tab' + (pcState.active === c.id ? ' on' : '') + '" onclick="pcSetCat(\'' + c.id + '\')">' + pcEsc(c.name) + ' <b>' + counts[c.id] + '</b></button>';
    });
    wrap.innerHTML = html;
}

function pcSetCat(id) {
    pcState.active = id;
    try { history.replaceState(null, '', id === 'all' ? location.pathname : '#' + encodeURIComponent(id)); } catch (e) {}
    pcRenderTabs();
    pcRenderList();
    var d = document.getElementById('pcCatDesc');
    if (d) {
        var c = pcState.cats.find(function (x) { return x.id === id; });
        d.textContent = c && c.description ? c.description : '';
        d.style.display = c && c.description ? 'block' : 'none';
    }
}

function pcRenderList() {
    var list = document.getElementById('pcList');
    if (!list) return;
    var eps = pcState.eps.filter(function (e) { return pcState.active === 'all' || e.categoryId === pcState.active; });
    if (!eps.length) {
        list.innerHTML = '<p class="pc-empty">' + (pcState.eps.length ? 'لا توجد حلقات في هذا القسم حالياً.' : 'الحلقات الجديدة قريباً. تابعنا.') + '</p>';
        return;
    }
    list.innerHTML = eps.map(function (ep) {
        var open = pcIsOpen(ep);
        var pending = !open && pcState.pending.has(ep.id);
        var badge = ep.openToAll === true
            ? '<span class="pc-badge free">مفتوحة للجميع</span>'
            : open ? '<span class="pc-badge open"><i class="fas fa-lock-open"></i> مفتوحة لك</span>'
            : pending ? '<span class="pc-badge wait"><i class="fas fa-hourglass-half"></i> قيد المراجعة</span>'
            : '<span class="pc-badge paid"><i class="fas fa-lock"></i> بموافقة الإدارة</span>';
        var meta = [pcCatName(ep.categoryId), pcDur(ep.duration), ep.mediaType === 'video' ? 'فيديو' : 'صوت'].filter(Boolean).join(' • ');
        return '' +
        '<article class="pc-ep">' +
            '<button type="button" class="pc-cover" onclick="pcOpen(\'' + ep.id + '\')" aria-label="تشغيل ' + pcEsc(ep.title) + '">' +
                (ep.coverUrl ? '<img src="' + pcEsc(ep.coverUrl) + '" alt="" loading="lazy" decoding="async">' : '<i class="fas fa-microphone-lines pc-cover-ph"></i>') +
                '<span class="pc-cover-btn"><i class="fas ' + (open ? 'fa-play' : 'fa-lock') + '"></i></span>' +
            '</button>' +
            '<div class="pc-ep-body">' +
                '<div class="pc-ep-meta">' + pcEsc(meta) + '</div>' +
                '<h3>' + pcEsc(ep.title) + '</h3>' +
                (ep.host ? '<div class="pc-host"><i class="fas fa-user-doctor"></i> ' + pcEsc(ep.host) + '</div>' : '') +
                (ep.description ? '<p>' + pcEsc(ep.description) + '</p>' : '') +
                '<div class="pc-ep-foot">' + badge +
                    '<button type="button" class="pc-act' + (open ? '' : ' lock') + '" onclick="pcOpen(\'' + ep.id + '\')">' +
                        (open ? '<i class="fas fa-play"></i> استمع' : '<i class="fab fa-whatsapp"></i> طلب سماع') + '</button>' +
                '</div>' +
            '</div>' +
        '</article>';
    }).join('');
}

/* ---------- نافذة منبثقة ---------- */
function pcModal(html, cls) {
    var m = document.getElementById('pcModal');
    if (!m) {
        m = document.createElement('div');
        m.id = 'pcModal';
        m.className = 'pc-modal';
        m.addEventListener('click', function (e) { if (e.target === m) pcClose(); });
        document.body.appendChild(m);
    }
    m.innerHTML = '<div class="pc-dialog ' + (cls || '') + '" role="dialog" aria-modal="true"><button type="button" class="pc-x" onclick="pcClose()" aria-label="إغلاق">&times;</button>' + html + '</div>';
    m.classList.add('on');
    document.body.classList.add('pc-lock');
}
function pcClose() {
    var m = document.getElementById('pcModal');
    if (!m) return;
    m.querySelectorAll('audio,video').forEach(function (el) { el.pause(); });
    m.classList.remove('on');
    m.innerHTML = '';
    document.body.classList.remove('pc-lock');
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') pcClose(); });

function pcOpen(id) {
    var ep = pcState.eps.find(function (e) { return e.id === id; });
    if (!ep) return;
    if (pcIsOpen(ep)) return pcPlay(ep);
    return pcUnlock(ep);
}

async function pcPlay(ep) {
    pcModal('<div class="pc-play-head"><small>' + pcEsc(pcCatName(ep.categoryId)) + '</small><h3>' + pcEsc(ep.title) + '</h3></div><p class="pc-empty"><i class="fas fa-spinner fa-spin"></i> جاري تجهيز الحلقة...</p>');
    try {
        var doc = await db.collection('podcastMedia').doc(ep.id).get();
        var url = doc.exists ? doc.data().url : '';
        if (!url) throw new Error('no media');
        var isVideo = ep.mediaType === 'video';
        var yt = url.match(/(?:youtu\.be\/|[?&]v=|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/);
        var dr = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
        var embed = yt ? 'https://www.youtube.com/embed/' + yt[1] + '?autoplay=1&rel=0'
                       : dr ? 'https://drive.google.com/file/d/' + dr[1] + '/preview' : '';
        var player = embed
            ? '<iframe src="' + pcEsc(embed) + '" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;"></iframe>'
            : isVideo
            ? '<video controls autoplay playsinline controlsList="nodownload" src="' + pcEsc(url) + '"></video>'
            : '<div class="pc-audio-art">' + (ep.coverUrl ? '<img src="' + pcEsc(ep.coverUrl) + '" alt="">' : '<i class="fas fa-microphone-lines"></i>') + '</div>' +
              '<audio controls autoplay controlsList="nodownload" src="' + pcEsc(url) + '"></audio>';
        pcModal('<div class="pc-play-head"><small>' + pcEsc(pcCatName(ep.categoryId)) + (ep.host ? ' • ' + pcEsc(ep.host) : '') + '</small><h3>' + pcEsc(ep.title) + '</h3></div>' +
            '<div class="pc-player ' + (isVideo ? 'video' : 'audio') + '">' + player + '</div>' +
            (ep.description ? '<p class="pc-play-desc">' + pcEsc(ep.description) + '</p>' : ''), 'wide');
    } catch (e) {
        console.error(e);
        pcModal('<div class="pc-play-head"><h3>' + pcEsc(ep.title) + '</h3></div><p class="pc-empty">تعذّر تشغيل الحلقة. تأكد من تسجيل الدخول أو تواصل معنا على واتساب.</p>');
    }
}

function pcUnlock(ep) {
    var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    var head = '<div class="pc-lockbox"><i class="fas fa-lock"></i></div><h3>' + pcEsc(ep.title) + '</h3>';
    if (!auth.currentUser) {
        pcModal(head + '<p>سجّل دخولك الأول عشان نقدر نفتحلك الحلقة على حسابك.</p>' +
            '<a class="pc-cta" href="register.html"><i class="fas fa-user-plus"></i> إنشاء حساب</a>' +
            '<a class="pc-link" href="login.html">عندك حساب؟ تسجيل الدخول</a>');
        return;
    }
    var u = auth.currentUser;
    var pending = pcState.pending.has(ep.id);
    var msg = 'السلام عليكم، أرغب في سماع حلقة البودكاست: "' + ep.title + '"' +
        '\nالاسم: ' + ((user && user.name) || u.displayName || '-') +
        '\nالهاتف: ' + ((user && user.phone) || '-') +
        '\nالبريد: ' + (u.email || '-') +
        '\nID الحساب: ' + u.uid +
        '\nID الحلقة: ' + ep.id;
    var href = 'https://wa.me/' + pcWA() + '?text=' + encodeURIComponent(msg);
    pcModal(head +
        (pending ? '<p class="pc-note"><i class="fas fa-hourglass-half"></i> طلبك وصل للإدارة وقيد المراجعة. هتتفتح الحلقة تلقائياً بعد الموافقة.</p>'
                 : '<p>الحلقة بتتفتح بموافقة الإدارة. اضغط الزر وابعت الطلب على واتساب (الرسالة فيها بياناتك والـ ID)، وبعد الموافقة هتشتغل على حسابك.</p>') +
        '<a class="pc-cta wa" href="' + href + '" target="_blank" rel="noopener" onclick="pcRequest(\'' + ep.id + '\')"><i class="fab fa-whatsapp"></i> ' + (pending ? 'تواصل مع الإدارة' : 'طلب سماع عبر واتساب') + '</a>' +
        '<small class="pc-num">' + (window.SITE_CONTACT ? SITE_CONTACT.display : '01152013172') + '</small>');
}

async function pcRequest(epId) {
    var ep = pcState.eps.find(function (e) { return e.id === epId; });
    var u = auth.currentUser;
    if (!ep || !u) return;
    var user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    try {
        await db.collection('podcastRequests').doc(u.uid + '_' + epId).set({
            userId: u.uid,
            userName: (user && user.name) || '',
            userPhone: (user && user.phone) || '',
            userEmail: u.email || '',
            episodeId: epId,
            episodeTitle: ep.title,
            status: 'pending',
            createdAt: new Date().toISOString(),
            createdAtMs: Date.now()
        }, { merge: true });
    } catch (e) { console.warn('podcast request failed', e); }
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('pcList')) pcInitPublic();
});

/* ======================= لوحة الإدارة ======================= */
var pcAdmin = { cats: [], eps: [], reqs: [], access: [], media: {} };

function pcAdminInput(label, inner, full) {
    return '<div class="form-group"' + (full ? ' style="grid-column:1/-1;"' : '') + '><label>' + label + '</label>' + inner + '</div>';
}
function pcCatOptions(sel) {
    return pcAdmin.cats.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === sel ? ' selected' : '') + '>' + pcEsc(c.name) + '</option>';
    }).join('');
}

async function renderAdminPodcast() {
    var wrap = document.getElementById('podcastAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        var r = await Promise.all([
            db.collection('podcastCategories').get(),
            db.collection('podcastEpisodes').get(),
            db.collection('podcastRequests').get(),
            db.collection('podcastAccess').get(),
            db.collection('podcastMedia').get()
        ]);
        pcAdmin.cats = r[0].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        pcAdmin.eps = r[1].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (a.order || 0) - (b.order || 0) || pcTs(b) - pcTs(a); });
        pcAdmin.reqs = r[2].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).sort(function (a, b) { return (b.createdAtMs || 0) - (a.createdAtMs || 0); });
        pcAdmin.access = r[3].docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        pcAdmin.media = {};
        var lockFix = db.batch(), lockN = 0;
        r[4].docs.forEach(function (d) {
            pcAdmin.media[d.id] = d.data().url || '';
            var ep = pcAdmin.eps.find(function (e) { return e.id === d.id; });
            if (d.data().free === true && !(ep && ep.openToAll === true)) { lockFix.set(d.ref, { free: false }, { merge: true }); lockN++; }
        });
        if (lockN) { try { await lockFix.commit(); } catch (err) { console.warn(err); } }
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<p style="color:var(--admin-text-muted);">تعذّر تحميل البيانات. تأكد من قواعد Firestore الخاصة بالبودكاست (راجع ملف firestore.rules).</p>';
        return;
    }
    pcRenderAdmin();
}

function pcRenderAdmin() {
    var wrap = document.getElementById('podcastAdminWrap');
    if (!wrap) return;
    var panel = 'background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;';
    var h3 = 'color:var(--admin-text);margin-bottom:14px;font-size:1rem;';
    var det = 'background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;';
    var sum = 'padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;align-items:center;gap:10px;';
    var grid = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

    /* الأقسام */
    var catsHtml = pcAdmin.cats.map(function (c) {
        var n = pcAdmin.eps.filter(function (e) { return e.categoryId === c.id; }).length;
        return '<form onsubmit="pcSaveCat(event,\'' + c.id + '\')" style="display:grid;grid-template-columns:2fr 3fr 90px auto auto;gap:8px;align-items:end;margin-bottom:10px;">' +
            pcAdminInput('اسم القسم (' + n + ' حلقة)', '<input name="name" value="' + pcEsc(c.name) + '" required>') +
            pcAdminInput('وصف قصير', '<input name="description" value="' + pcEsc(c.description || '') + '">') +
            pcAdminInput('الترتيب', '<input type="number" name="order" value="' + (c.order || 0) + '">') +
            '<button type="submit" class="form-submit" style="width:auto;padding:10px 16px;">حفظ</button>' +
            '<button type="button" class="btn-outline" style="padding:8px 12px;color:#e05656;" onclick="pcDeleteCat(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
        '</form>';
    }).join('');

    /* إضافة حلقة */
    var addEp =
        '<form id="pcAddForm" onsubmit="pcAddEpisode(event)" style="' + grid + '">' +
            pcAdminInput('عنوان الحلقة', '<input name="title" required>', true) +
            pcAdminInput('القسم الفرعي', '<select name="categoryId" required>' + (pcCatOptions('') || '<option value="">أضف قسماً أولاً</option>') + '</select>') +
            pcAdminInput('اسم الضيف / المقدّم', '<input name="host">') +
            pcAdminInput('حلقة مفتوحة للجميع؟', '<label style="color:var(--admin-text);display:flex;gap:8px;align-items:center;"><input type="checkbox" name="openToAll"> نعم (بدون طلب سماع) — الافتراضي: بموافقة الإدارة</label>') +
            pcAdminInput('الترتيب', '<input type="number" name="order" value="' + (pcAdmin.eps.length + 1) + '">') +
            pcAdminInput('وصف الحلقة', '<textarea name="description" rows="3"></textarea>', true) +
            pcAdminInput('صورة الغلاف (اختياري — من الجهاز)', '<input type="file" name="cover" accept="image/*">') +
            pcAdminInput('ملف الحلقة — صوت أو فيديو من جهازك', '<div class="mn-file-box"><input type="file" name="mediaFile" accept="audio/*,video/*"><small style="display:block;margin-top:6px;opacity:.75;">الحد الأقصى 100 ميجا للملف. النوع (صوت/فيديو) بيتحدد تلقائياً.</small></div>', true) +
            pcAdminInput('أو الصق رابط (يوتيوب / درايف / رابط مباشر) بدل الرفع', '<input type="text" name="mediaUrl" placeholder="https://..." dir="ltr">', true) +
            '<div style="grid-column:1/-1;"><label style="color:var(--admin-text);display:flex;gap:8px;align-items:center;"><input type="checkbox" name="published" checked> منشورة على الموقع</label></div>' +
            '<div style="grid-column:1/-1;"><div id="pcAddProgress" style="display:none;color:var(--admin-text);"></div></div>' +
            '<div style="grid-column:1/-1;"><button type="submit" class="form-submit" style="width:auto;padding:10px 28px;"><i class="fas fa-paper-plane"></i> نشر الحلقة</button></div>' +
        '</form>';

    /* الحلقات الحالية */
    var epsHtml = pcAdmin.eps.map(function (e) {
        var pr = e.openToAll === true ? 'مفتوحة للجميع' : 'بموافقة';
        return '<details style="' + det + '"><summary style="' + sum + '">' +
            '<span style="display:flex;align-items:center;gap:10px;min-width:0;">' +
                (e.coverUrl ? '<img src="' + pcEsc(e.coverUrl) + '" alt="" style="width:42px;height:42px;border-radius:8px;object-fit:cover;">' : '<i class="fas fa-microphone-lines"></i>') +
                '<span style="overflow:hidden;text-overflow:ellipsis;">' + pcEsc(e.title) + '</span></span>' +
            '<span style="font-size:.8rem;opacity:.8;white-space:nowrap;">' + pcEsc(pcAdminCatName(e.categoryId)) + ' • ' + pr + (e.published === false ? ' • مخفية' : '') + '</span></summary>' +
            '<form onsubmit="pcSaveEpisode(event,\'' + e.id + '\')" style="padding:0 16px 16px;' + grid + '">' +
                pcAdminInput('العنوان', '<input name="title" value="' + pcEsc(e.title) + '" required>', true) +
                pcAdminInput('القسم الفرعي', '<select name="categoryId">' + pcCatOptions(e.categoryId) + '</select>') +
                pcAdminInput('الضيف / المقدّم', '<input name="host" value="' + pcEsc(e.host || '') + '">') +
                pcAdminInput('حلقة مفتوحة للجميع؟', '<label style="color:var(--admin-text);display:flex;gap:8px;align-items:center;"><input type="checkbox" name="openToAll"' + (e.openToAll === true ? ' checked' : '') + '> نعم (بدون طلب سماع)</label>') +
                pcAdminInput('الترتيب', '<input type="number" name="order" value="' + (e.order || 0) + '">') +
                pcAdminInput('الوصف', '<textarea name="description" rows="3">' + pcEsc(e.description || '') + '</textarea>', true) +
                pcAdminInput('استبدال الغلاف (اختياري)', '<input type="file" name="cover" accept="image/*">') +
                pcAdminInput('استبدال ملف الحلقة من جهازك (اختياري — صوت أو فيديو)', '<div class="mn-file-box"><input type="file" name="mediaFile" accept="audio/*,video/*"></div>', true) +
                pcAdminInput('الرابط الحالي / رابط بديل', '<input type="text" name="mediaUrl" value="' + pcEsc((pcAdmin.media && pcAdmin.media[e.id]) || '') + '" dir="ltr">', true) +
                '<input type="hidden" name="mediaType" value="' + (e.mediaType === 'video' ? 'video' : 'audio') + '">' +
                '<div style="grid-column:1/-1;"><label style="color:var(--admin-text);display:flex;gap:8px;align-items:center;"><input type="checkbox" name="published"' + (e.published === false ? '' : ' checked') + '> منشورة على الموقع</label></div>' +
                '<div style="grid-column:1/-1;"><div class="pcEpProgress" style="display:none;color:var(--admin-text);"></div></div>' +
                '<div style="grid-column:1/-1;display:flex;gap:10px;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ التعديلات</button>' +
                '<button type="button" class="btn-outline" style="padding:8px 14px;color:#e05656;" onclick="pcDeleteEpisode(\'' + e.id + '\')"><i class="fas fa-trash"></i> حذف الحلقة</button></div>' +
            '</form></details>';
    }).join('');

    /* الطلبات والصلاحيات */
    var pend = pcAdmin.reqs.filter(function (r) { return r.status === 'pending'; });
    var reqRows = pend.map(function (r) {
        return '<tr><td>' + pcEsc(r.userName || '-') + '</td><td dir="ltr">' + pcEsc(r.userPhone || '-') + '<br><small>' + pcEsc(r.userEmail || '') + '</small></td><td dir="ltr"><small>' + pcEsc(r.userId || '') + '</small></td><td>' + pcEsc(r.episodeTitle) + '</td>' +
            '<td style="white-space:nowrap;"><button class="btn-sm btn-edit" onclick="pcApprove(\'' + r.id + '\')">تفعيل</button> ' +
            '<button class="btn-sm btn-delete" onclick="pcReject(\'' + r.id + '\')">رفض</button></td></tr>';
    }).join('');
    var accRows = pcAdmin.access.slice().sort(function (a, b) { return (b.grantedAtMs || 0) - (a.grantedAtMs || 0); }).slice(0, 100).map(function (a) {
        return '<tr><td>' + pcEsc(a.userName || a.userId) + '</td><td dir="ltr">' + pcEsc(a.userPhone || '-') + '</td><td>' + pcEsc(a.episodeTitle || a.episodeId) + '</td>' +
            '<td><button class="btn-sm btn-delete" onclick="pcRevoke(\'' + a.id + '\')">سحب</button></td></tr>';
    }).join('');

    wrap.innerHTML =
        '<div style="' + panel + '"><h3 style="' + h3 + '">الأقسام الفرعية</h3>' + (catsHtml || '<p style="color:var(--admin-text-muted);">أضف أول قسم (مثال: الصحة النفسية، العلاقات، الصدمات...).</p>') +
            '<form onsubmit="pcAddCat(event)" style="display:grid;grid-template-columns:2fr 3fr auto;gap:8px;align-items:end;border-top:1px solid var(--admin-border);padding-top:14px;margin-top:6px;">' +
                pcAdminInput('قسم جديد', '<input name="name" required placeholder="اسم القسم">') +
                pcAdminInput('وصف قصير (اختياري)', '<input name="description">') +
                '<button type="submit" class="form-submit" style="width:auto;padding:10px 18px;"><i class="fas fa-plus"></i> إضافة</button>' +
            '</form></div>' +
        '<div style="' + panel + '"><h3 style="' + h3 + '">إضافة حلقة جديدة</h3>' + addEp + '</div>' +
        '<h3 style="' + h3 + '">الحلقات (' + pcAdmin.eps.length + ')</h3>' + (epsHtml || '<p style="color:var(--admin-text-muted);">لا توجد حلقات بعد.</p>') +
        '<div style="' + panel + 'margin-top:24px;"><h3 style="' + h3 + '">طلبات فتح الحلقات (' + pend.length + ')</h3>' +
            '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th>الاسم</th><th>الهاتف / البريد</th><th>ID الحساب</th><th>الحلقة</th><th>إجراء</th></tr></thead><tbody>' +
            (reqRows || '<tr><td colspan="5" style="text-align:center;">لا توجد طلبات معلّقة</td></tr>') + '</tbody></table></div></div>' +
        '<div style="' + panel + '"><h3 style="' + h3 + '">الحلقات المفتوحة للمستخدمين</h3>' +
            '<div style="overflow-x:auto;"><table class="admin-table"><thead><tr><th>المستخدم</th><th>الهاتف</th><th>الحلقة</th><th>إجراء</th></tr></thead><tbody>' +
            (accRows || '<tr><td colspan="4" style="text-align:center;">لا توجد صلاحيات ممنوحة بعد</td></tr>') + '</tbody></table></div></div>';
}
function pcAdminCatName(id) {
    var c = pcAdmin.cats.find(function (x) { return x.id === id; });
    return c ? c.name : 'بدون قسم';
}

/* ---- الأقسام ---- */
async function pcAddCat(ev) {
    ev.preventDefault();
    var f = ev.target;
    await db.collection('podcastCategories').add({
        name: f.name.value.trim(), description: f.description.value.trim(), order: pcAdmin.cats.length + 1
    });
    showToast('تمت إضافة القسم');
    renderAdminPodcast();
}
async function pcSaveCat(ev, id) {
    ev.preventDefault();
    var f = ev.target;
    await db.collection('podcastCategories').doc(id).set({
        name: f.name.value.trim(), description: f.description.value.trim(), order: Number(f.order.value) || 0
    }, { merge: true });
    showToast('تم حفظ القسم');
    renderAdminPodcast();
}
async function pcDeleteCat(id) {
    var n = pcAdmin.eps.filter(function (e) { return e.categoryId === id; }).length;
    if (n) { showToast('انقل أو احذف حلقات هذا القسم أولاً (' + n + ')', 'error'); return; }
    if (!confirm('حذف هذا القسم؟')) return;
    await db.collection('podcastCategories').doc(id).delete();
    showToast('تم الحذف');
    renderAdminPodcast();
}

/* ---- الحلقات ---- */
async function pcAddEpisode(ev) {
    ev.preventDefault();
    var f = ev.target;
    if (!f.categoryId.value) { showToast('أضف قسماً فرعياً أولاً', 'error'); return; }
    var mediaUrl = (f.mediaUrl.value || '').trim();
    var mediaFile = f.mediaFile && f.mediaFile.files[0];
    if (!mediaFile && !pcValidMedia(mediaUrl)) { showToast('ارفع ملف الحلقة من جهازك أو الصق رابطاً صحيحاً', 'error'); return; }
    var btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    var ui = mnProgressUI(document.getElementById('pcAddProgress'));
    try {
        var duration = 0;
        var uploadedType = '';
        if (mediaFile) {
            duration = await mnMediaDuration(mediaFile);
            var up = await mnCloudUploadMedia(mediaFile, 'maana/podcast/media', function (p) { ui.set(p, 'رفع الحلقة'); });
            mediaUrl = up.url;
            uploadedType = up.isVideo ? 'video' : 'audio';
        }
        var openToAll = f.openToAll.checked;
        var cover = null;
        if (f.cover.files[0]) {
            var img = await mnPrepareImage(f.cover.files[0], 800);
            cover = await mnUploadFile(img, 'podcast/covers', function (p) { ui.set(p, 'تجهيز الغلاف'); });
        }
        var ref = db.collection('podcastEpisodes').doc();
        var batch = db.batch();
        batch.set(ref, {
            title: f.title.value.trim(), description: f.description.value.trim(), host: f.host.value.trim(),
            categoryId: f.categoryId.value, price: 0, openToAll: openToAll, order: Number(f.order.value) || 0,
            published: f.published.checked, mediaType: uploadedType || ((/\.(mp4|webm|mov)(\?|$)/i.test(mediaUrl)) ? 'video' : 'audio'),
            duration: duration, coverUrl: cover ? cover.url : '', createdAtMs: Date.now()
        });
        batch.set(db.collection('podcastMedia').doc(ref.id), { url: mediaUrl, free: openToAll });
        await batch.commit();
        ui.done('تم النشر');
        showToast('تم نشر الحلقة');
        renderAdminPodcast();
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ: ' + (e.code || e.message || 'خطأ'), 'error');
        btn.disabled = false;
    }
}

async function pcSaveEpisode(ev, id) {
    ev.preventDefault();
    var f = ev.target;
    var btn = f.querySelector('button[type=submit]');
    btn.disabled = true;
    var ui = mnProgressUI(f.querySelector('.pcEpProgress'));
    try {
        var openToAll = f.openToAll.checked;
        var patch = {
            title: f.title.value.trim(), description: f.description.value.trim(), host: f.host.value.trim(),
            categoryId: f.categoryId.value, price: 0, openToAll: openToAll, order: Number(f.order.value) || 0, published: f.published.checked,
            mediaType: f.mediaType.value
        };
        var mediaPatch = { free: openToAll };
        var newUrl = (f.mediaUrl.value || '').trim();
        var newFile = f.mediaFile && f.mediaFile.files[0];
        if (newFile) {
            patch.duration = await mnMediaDuration(newFile);
            var up = await mnCloudUploadMedia(newFile, 'maana/podcast/media', function (p) { ui.set(p, 'رفع الحلقة'); });
            newUrl = up.url;
            patch.mediaType = up.isVideo ? 'video' : 'audio';
        } else if (/\.(mp4|webm|mov)(\?|$)/i.test(newUrl)) {
            patch.mediaType = 'video';
        }

        if (newUrl) {
            if (!pcValidMedia(newUrl)) throw new Error('مسار/رابط الحلقة غير صحيح');
            mediaPatch.url = newUrl;
        }
        if (f.cover.files[0]) {
            var img = await mnPrepareImage(f.cover.files[0], 800);
            var c = await mnUploadFile(img, 'podcast/covers', function (p) { ui.set(p, 'تجهيز الغلاف'); });
            patch.coverUrl = c.url;
        }
        var batch = db.batch();
        batch.set(db.collection('podcastEpisodes').doc(id), patch, { merge: true });
        batch.set(db.collection('podcastMedia').doc(id), mediaPatch, { merge: true });
        await batch.commit();
        ui.done('تم الحفظ');
        showToast('تم حفظ الحلقة');
        renderAdminPodcast();
    } catch (e) {
        console.error(e);
        showToast('فشل الحفظ: ' + (e.code || e.message || 'خطأ'), 'error');
        btn.disabled = false;
    }
}

async function pcDeleteEpisode(id) {
    if (!confirm('حذف الحلقة نهائياً (مع صلاحيات المستخدمين)؟')) return;
    var ep = pcAdmin.eps.find(function (e) { return e.id === id; }) || {};
    try {
        var batch = db.batch();
        batch.delete(db.collection('podcastEpisodes').doc(id));
        batch.delete(db.collection('podcastMedia').doc(id));
        pcAdmin.access.filter(function (a) { return a.episodeId === id; }).forEach(function (a) { batch.delete(db.collection('podcastAccess').doc(a.id)); });
        pcAdmin.reqs.filter(function (r) { return r.episodeId === id; }).forEach(function (r) { batch.delete(db.collection('podcastRequests').doc(r.id)); });
        await batch.commit();
        showToast('تم حذف الحلقة');
        renderAdminPodcast();
    } catch (e) {
        console.error(e);
        showToast('تعذّر الحذف', 'error');
    }
}

/* ---- الطلبات والصلاحيات ---- */
async function pcApprove(reqId) {
    var r = pcAdmin.reqs.find(function (x) { return x.id === reqId; });
    if (!r) return;
    var batch = db.batch();
    batch.set(db.collection('podcastAccess').doc(reqId), {
        userId: r.userId, userName: r.userName || '', userPhone: r.userPhone || '',
        episodeId: r.episodeId, episodeTitle: r.episodeTitle || '', grantedAtMs: Date.now()
    });
    batch.set(db.collection('podcastRequests').doc(reqId), { status: 'approved' }, { merge: true });
    await batch.commit();
    showToast('تم فتح الحلقة للمستخدم');
    renderAdminPodcast();
}
async function pcReject(reqId) {
    await db.collection('podcastRequests').doc(reqId).set({ status: 'rejected' }, { merge: true });
    showToast('تم رفض الطلب');
    renderAdminPodcast();
}
async function pcRevoke(accessId) {
    if (!confirm('سحب صلاحية فتح الحلقة من هذا المستخدم؟')) return;
    var batch = db.batch();
    batch.delete(db.collection('podcastAccess').doc(accessId));
    batch.set(db.collection('podcastRequests').doc(accessId), { status: 'revoked' }, { merge: true });
    await batch.commit();
    showToast('تم سحب الصلاحية');
    renderAdminPodcast();
}
