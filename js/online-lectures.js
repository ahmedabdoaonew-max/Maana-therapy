/* ============================================
   المحاضرات الأونلاين - online-lectures.js
   4 أقسام × 8 محاضرات، تستخدم نفس مجموعة Firestore (lectures)
   مع حقل onlineCategory (1-4) لتصنيفها، ونفس Cloud Function
   verifyLectureAccess المستخدمة في باقي نظام المحاضرات بالموقع.
   ============================================ */

const ONLINE_LECTURE_CATEGORIES_DEFAULT = [
    { id: 1, title: 'أساسيات الإدارة والقيادة', icon: 'fa-people-group' },
    { id: 2, title: 'تطوير المهارات المهنية', icon: 'fa-rocket' },
    { id: 3, title: 'التواصل والعرض التقديمي', icon: 'fa-people-arrows' },
    { id: 4, title: 'الجودة وإدارة المشاريع', icon: 'fa-diagram-project' }
];

let olCurrentCategory = null;
let olCurrentLectureId = null;

/** يدمج الفئات الافتراضية مع أي تعديلات (عنوان/صور) محفوظة في Firestore */
async function olGetCategories() {
    let overrides = {};
    try {
        const snap = await db.collection('onlineCategories').get();
        snap.forEach(doc => { overrides[doc.id] = doc.data(); });
    } catch (e) { console.error(e); }

    return ONLINE_LECTURE_CATEGORIES_DEFAULT.map(cat => {
        const o = overrides[String(cat.id)] || {};
        return {
            id: cat.id,
            title: o.title || cat.title,
            icon: cat.icon,
            img1: o.img1 || '',
            img2: o.img2 || ''
        };
    });
}

async function olLoadWhatsappNumber() {
    try {
        const doc = await db.collection('settings').doc('onlineLectures').get();
        return doc.exists ? (doc.data().whatsappNumber || '') : '';
    } catch (e) { return ''; }
}

async function olRenderCategories() {
    const container = document.getElementById('olCategories');
    if (!container) return;

    // 1) عرض فوري بالبيانات الافتراضية — الصفحة لا تظهر فارغة أبداً حتى لو Firestore بطيء/غير متاح
    olPaintCategories(container, ONLINE_LECTURE_CATEGORIES_DEFAULT.map(c => ({ ...c, img1: '', img2: '' })), {});

    // 2) تحسين البيانات لاحقاً من Firestore (عناوين/صور مخصصة + عدد المحاضرات الفعلي)
    let allLectures = {};
    try { allLectures = await getLecturesAsync(); } catch (e) { console.error('[online-lectures] تعذّرت قراءة المحاضرات:', e); }

    let categories = ONLINE_LECTURE_CATEGORIES_DEFAULT;
    try { categories = await olGetCategories(); } catch (e) { console.error('[online-lectures] تعذّرت قراءة الأقسام:', e); }

    olPaintCategories(container, categories, allLectures);

    try {
        const wa = SITE_CONTACT.whatsapp;
        const waBtn = document.getElementById('olWhatsappBtn');
        if (waBtn) {
            if (wa) {
                waBtn.href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('أرغب في الاستفسار عن المحاضرات الأونلاين');
                waBtn.style.display = 'inline-flex';
            } else {
                waBtn.style.display = 'none';
            }
        }
    } catch (e) { console.error(e); }
}

function olPaintCategories(container, categories, allLectures) {
    container.innerHTML = '';
    categories.forEach(cat => {
        const count = Object.values(allLectures).filter(l => l.onlineCategory === cat.id && l.active).length;
        const card = document.createElement('div');
        card.className = 'ol-cat-card fade-in';

        const hasImgs = cat.img1 || cat.img2;
        const coverHtml = hasImgs
            ? `<div class="ol-cat-cover">
                 ${cat.img1 ? `<img src="${cat.img1}" class="active" alt="${cat.title}">` : ''}
                 ${cat.img2 ? `<img src="${cat.img2}" alt="${cat.title}">` : ''}
               </div>`
            : `<div class="ol-cat-icon"><i class="fas ${cat.icon}"></i></div>`;

        card.innerHTML = `
            ${coverHtml}
            <h3>${cat.title}</h3>
            <span class="ol-cat-count">${count} محاضرة</span>
        `;
        card.addEventListener('click', () => olOpenCategory(cat));
        container.appendChild(card);
    });

    // تبديل الصورتين تلقائياً لكل بطاقة فيها غلاف متحرك
    container.querySelectorAll('.ol-cat-cover').forEach(cover => {
        const imgs = cover.querySelectorAll('img');
        if (imgs.length < 2) return;
        let i = 0;
        setInterval(() => {
            imgs[i].classList.remove('active');
            i = (i + 1) % imgs.length;
            imgs[i].classList.add('active');
        }, 2600);
    });
}

async function olOpenCategory(cat) {
    olCurrentCategory = cat.id;
    document.getElementById('olCategories').style.display = 'none';
    const panel = document.getElementById('olLecturesPanel');
    panel.classList.add('active');
    document.getElementById('olPanelTitle').textContent = cat.title;

    const grid = document.getElementById('olLecturesGrid');
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">جاري التحميل...</p>';

    let allLectures = {};
    try { allLectures = await getLecturesAsync(); } catch (e) { console.error(e); }

    const lectures = Object.values(allLectures)
        .filter(l => l.onlineCategory === cat.id && l.active)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    grid.innerHTML = '';
    if (!lectures.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#888;">لا توجد محاضرات في هذا القسم بعد</p>';
        return;
    }

    lectures.forEach(lec => {
        const card = document.createElement('div');
        card.className = 'ol-lecture-card';
        card.innerHTML = `
            <h4>${lec.title}</h4>
            <span class="ol-price">${lec.price > 0 ? lec.price + ' ج.م' : 'مجانية'}</span>
            <button type="button" class="ol-watch-btn">مشاهدة</button>
        `;
        card.querySelector('.ol-watch-btn').addEventListener('click', () => olOpenAccessModal(lec.id));
        grid.appendChild(card);
    });
}

function olShowCategories() {
    document.getElementById('olCategories').style.display = 'grid';
    document.getElementById('olLecturesPanel').classList.remove('active');
}

function olOpenAccessModal(lectureId) {
    olCurrentLectureId = lectureId;
    document.getElementById('olAccessModal').classList.add('active');
}

/** تسجيل الحضور مباشرة في Firestore (بدون Cloud Function) - نفس نظام الملف المرجعي */
function olNormalizeName(n) {
    return (n || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function olAccessLecture(event) {
    event.preventDefault();
    const name = document.getElementById('olAccessName').value.trim();
    const code = document.getElementById('olAccessCode').value.trim().toUpperCase();
    if (!name || !code) return;

    try {
        const lecDoc = await db.collection('lectures').doc(olCurrentLectureId).get();
        if (!lecDoc.exists) {
            showToast('المحاضرة غير موجودة', 'error');
            return;
        }
        const lec = lecDoc.data();

        if (code !== String(lec.id || olCurrentLectureId).toUpperCase()) {
            showToast('كود المحاضرة غير صحيح', 'error');
            return;
        }
        if (!lec.mediaUrl) {
            showToast('لم يتم إضافة رابط هذه المحاضرة بعد من الإدارة', 'error');
            return;
        }

        const regId = olCurrentLectureId + '__' + olNormalizeName(name);
        const regRef = db.collection('registrations').doc(regId);
        const regDoc = await regRef.get();
        const count = regDoc.exists ? (regDoc.data().viewCount || 0) : 0;
        const limit = lec.maxViews || 0;

        if (limit > 0 && count >= limit) {
            showToast('لقد استنفدت عدد المشاهدات المسموح بها لهذا الكود', 'error');
            return;
        }

        await regRef.set({
            name: name.trim(), lectureId: olCurrentLectureId, viewCount: count + 1,
            lastAccess: new Date().toISOString()
        });

        sessionStorage.setItem('currentLecture', JSON.stringify({
            id: olCurrentLectureId, title: lec.title, url: lec.mediaUrl, name
        }));
        showToast('تم التحقق! جاري فتح المحاضرة...');
        setTimeout(() => { window.location.href = 'lecture.html'; }, 700);
    } catch (err) {
        console.error(err);
        showToast('تعذّر الاتصال، حاول مرة أخرى', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('olCategories')) olRenderCategories();
});
