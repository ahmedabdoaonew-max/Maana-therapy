
async function renderGroupLectures(groupId, contentBox, g) {
    if (!contentBox) return;
    const allLecs = await getLecturesAsync();
    const hubSettings = await getLecturesHubSettings();
    const whatsappModeOn = hubSettings.accessMode === 'whatsapp';
    const subLectures = Object.values(allLecs)
        .filter(l => (l.groupId === groupId || l.subId === groupId) && l.active)
        .sort((a, b) => a.id.localeCompare(b.id));
    let lecturesHtml = subLectures.map(function(lec) {
        const accessLabel = whatsappModeOn
            ? '<span class="badge badge-warning">موافقة عبر واتساب</span>'
            : lec.accessType === 'admin'
            ? '<span class="badge badge-warning">موافقة أدمن</span>'
            : lec.accessType === 'code'
            ? '<span class="badge badge-info">كود مخصص</span>'
            : '<span class="badge badge-success">شراء</span>';
        return '<div class="inner-lecture-row"><div class="inner-lecture-info"><strong>' + lec.title + '</strong>' +
            '<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">' + accessLabel +
            '<span style="font-size:0.8rem;color:#888;">الكود: ' + lec.id + '</span>' +
            '<span style="font-size:0.9rem;font-weight:700;color:var(--primary-blue);">' + lec.price + ' ج.م</span></div></div>' +
            '<div class="inner-lecture-actions"><button type="button" class="btn-sm btn-view" onclick="startLectureAccess(\'' + lec.id + '\')">مشاهدة / شراء</button></div></div>';
    }).join('');
    if (!lecturesHtml) lecturesHtml = '<p style="text-align:center;color:#888;padding:20px;">لا توجد محاضرات</p>';
    contentBox.innerHTML = '<div class="sub-lectures-box"><div class="sub-lectures-header"><div><h3 style="color:var(--primary-dark);margin:0 0 4px;">' + g.title + '</h3><p style="color:var(--text-muted);margin:0;font-size:0.95rem;">' + g.desc + '</p></div><span class="badge badge-info">' + subLectures.length + ' محاضرة</span></div><div class="sub-lectures-list">' + lecturesHtml + '</div><div style="margin-top:20px;"><a href="index.html#lecturesHub" class="btn-outline" style="padding:10px 20px;border-radius:30px;display:inline-flex;">← العودة</a></div></div>';
}

/* ============================================
   إدارة الأقسام - courses.js
   عرض الأقسام + فتح صفحات جديدة للفرعية
   ============================================ */

// ترتيب: 3 في كل صف (بدون ثعبان معقد - أوضح للمستخدم)
// ملاحظة: الأقسام ال13 القديمة محذوفة. أضف أرقام الأقسام الجديدة هنا عند إنشائها في sectionsData.
function getSectionsOrder() {
    // القسم 15 = تنمية المهارات (يظهر في شبكة الأقسام)
    return [15];
}

// ========== كاش إعدادات الأقسام (مجاني/نشط/رابط خارجي/كود دخول) — Firestore: sectionSettings ==========
let __sectionSettingsCache = {};
try {
    __sectionSettingsCache = JSON.parse(localStorage.getItem('sectionSettingsCache') || '{}');
} catch (e) {
    __sectionSettingsCache = {};
}

function getSectionSettings() {
    return __sectionSettingsCache || {};
}

async function refreshSectionSettingsCache() {
    try {
        const snap = await db.collection('sectionSettings').get();
        const map = {};
        snap.forEach(function (doc) { map[doc.id] = doc.data(); });
        __sectionSettingsCache = map;
        try { localStorage.setItem('sectionSettingsCache', JSON.stringify(map)); } catch (e) {}
    } catch (e) {
        console.warn('[sections] تعذّر تحميل إعدادات الأقسام من الخادم، سيتم استخدام النسخة المحفوظة محلياً', e);
    }
}

async function saveSectionSetting(id, partial) {
    const current = __sectionSettingsCache[id] || {};
    const merged = Object.assign({}, current, partial);
    await db.collection('sectionSettings').doc(String(id)).set(merged, { merge: true });
    __sectionSettingsCache[id] = merged;
    try { localStorage.setItem('sectionSettingsCache', JSON.stringify(__sectionSettingsCache)); } catch (e) {}
}

// ========== صلاحية الوصول لقسم: مجاني (ثابت أو من إعدادات الأدمن) أو أدمن أو مشترك ==========
function canAccessSection(id) {
    const section = sectionsData.find(function (s) { return s.id === id; });
    if (!section) return false;
    const st = __sectionSettingsCache[id] || {};
    const isFree = (typeof st.free === 'boolean') ? st.free : !!section.free;
    if (isFree) return true;
    const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
    if (!user) return false;
    if (user.isAdmin) return true;
    if (user.subscriptionType === 'premium') return true;
    if (Array.isArray(user.allowedSections) && user.allowedSections.indexOf(id) !== -1) return true;
    return false;
}

async function renderSectionsGrid(containerId = 'sectionsGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // عرض فوري من النسخة المخزّنة محلياً (بدون انتظار الشبكة) لسرعة التحميل،
    // ثم تحديث هادئ بالخلفية إذا تغيّرت إعدادات الأقسام في Firestore (تفعيل/تعطيل/سعر...).
    buildSectionsGridDOM(container);
    try {
        await refreshSectionSettingsCache();
        buildSectionsGridDOM(container);
    } catch (e) {
        console.error('[sections] تعذّر تحديث إعدادات الأقسام', e);
    }
}

function buildSectionsGridDOM(container) {
    const order = getSectionsOrder();
    const gridIds = order.filter(id => id !== 13);
    const rectId = order.includes(13) ? 13 : null;

    container.innerHTML = '';

    gridIds.forEach((id, index) => {
        const section = sectionsData.find(s => s.id === id);
        if (!section) return;

        const hasAccess = canAccessSection(id);
        const isLocked = !hasAccess;

        const card = document.createElement('div');
        card.className = 'section-card' + (isLocked ? ' locked' : '');
        card.dataset.id = id;
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        const accent = section.theme || 'var(--primary-blue)';
        card.style.borderTop = `4px solid ${accent}`;
        const imgUrl = (typeof getSectionImage === 'function') ? getSectionImage(section.id) : '';
        card.innerHTML = `
            <div class="section-img" data-icon="${section.icon}" style="${imgUrl ? '' : 'background:linear-gradient(135deg,' + accent + ',var(--primary-dark));'}">
                ${imgUrl ? '<img src="' + imgUrl + '" alt="" class="section-cover-img">' : '<i class="fas ' + section.icon + '"></i>'}
            </div>
            <div class="section-body">
                <span class="section-num" style="background:${accent};color:#fff;">القسم ${section.id}</span>
                <h3>${section.title}</h3>
                <p>${section.desc}</p>
            </div>
        `;
        const cover = card.querySelector('.section-cover-img');
        if (cover) {
            cover.addEventListener('error', function () {
                const box = this.parentElement;
                this.remove();
                box.innerHTML = '<i class="fas ' + section.icon + '"></i>';
            });
        }

        const open = () => openSectionPage(section, hasAccess);
        card.addEventListener('click', open);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
        container.appendChild(card);
    });

    initSectionCardsReveal(container);
    renderSectionThirteenBanner(rectId);
}

/** القسم 13 يُعرض كبطاقة مستطيلة عريضة منفصلة عن شبكة ال12 قسم */
function renderSectionThirteenBanner(sectionId) {
    const wrap = document.getElementById('sectionThirteenWrap');
    if (!wrap || !sectionId) return;

    const section = sectionsData.find(s => s.id === sectionId);
    if (!section) return;

    const hasAccess = canAccessSection(sectionId);
    const accent = section.theme || 'var(--primary-blue)';

    wrap.innerHTML = `
        <div class="section-card section-card-wide fade-in" style="border-top:4px solid ${accent};">
            <div class="section-img" data-icon="${section.icon}" style="background:linear-gradient(135deg,${accent},var(--primary-dark));">
                <i class="fas ${section.icon}"></i>
            </div>
            <div class="section-body">
                <span class="section-num" style="background:${accent};color:#fff;">القسم ${section.id}</span>
                <h3>${section.title}</h3>
                <p>${section.desc}</p>
            </div>
        </div>
    `;
    const card = wrap.querySelector('.section-card-wide');
    const open = () => openSectionPage(section, hasAccess);
    card.addEventListener('click', open);
}

/** يفعّل ظهور بطاقات الأقسام تدريجياً عند وصولها لمنطقة الرؤية أثناء التمرير */
function initSectionCardsReveal(container) {
    const cards = container.querySelectorAll('.section-card');
    if (!('IntersectionObserver' in window)) {
        cards.forEach(c => c.classList.add('revealed'));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const posInGroup = Array.from(cards).indexOf(card) % 3;
                setTimeout(() => card.classList.add('revealed'), posInGroup * 120);
                observer.unobserve(card);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    cards.forEach(c => observer.observe(c));
}

/** فتح صفحة القسم (نافذة/صفحة جديدة بالفرعيات) */
function openSectionPage(section, hasAccess) {
    const settings = getSectionSettings();
    const st = settings[section.id] || {};

    // القسم مُعدّ لينقل لموقع خارجي بدل الصفحة الداخلية
    if (st.linkType === 'external' && st.externalUrl) {
        window.open(st.externalUrl, '_blank');
        return;
    }

    if (!hasAccess) {
        const user = getCurrentUser();
        if (!user) {
            showToast('يرجى تسجيل الدخول أولاً للوصول إلى هذا القسم', 'warning');
            setTimeout(() => { window.location.href = 'login.html'; }, 1200);
            return;
        }
        openSubscriptionModal(section);
        return;
    }

    // قسم تنمية المهارات → مجلد skills-module
    if (section.id === 15) {
        window.location.href = 'skills-module/skills.html';
        return;
    }

    window.location.href = 'section-' + section.id + '.html';
}

/** نافذة طلب الاشتراك في قسم مدفوع: دفع أونلاين أو تواصل واتساب + موافقة أدمن */
function openSubscriptionModal(section) {
    let modal = document.getElementById('subscriptionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'subscriptionModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal" style="max-width:420px;padding:26px;text-align:center;">
            <button type="button" class="modal-close" onclick="document.getElementById('subscriptionModal').classList.remove('active')" style="position:absolute;left:16px;top:16px;">&times;</button>
            <h3 style="color:var(--primary-dark);margin-bottom:6px;">الاشتراك في: ${section.title}</h3>
            <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.9rem;">هذا القسم غير مشمول في اشتراكك الحالي. تواصل معنا لتفعيله:</p>
            <button type="button" class="program-book-btn" style="width:100%;padding:14px;border:none;border-radius:30px;cursor:pointer;" onclick="requestSectionSubscription(${section.id}, '${section.title.replace(/'/g, "\\'")}')">
                <i class="fab fa-whatsapp"></i> تواصل عبر واتساب لتفعيل الاشتراك
            </button>
        </div>
    `;
    modal.classList.add('active');
}

/** إنشاء طلب اشتراك (يظهر عند الأدمن للموافقة) + فتح واتساب برسالة فيها بيانات المستخدم */
async function requestSectionSubscription(sectionId, sectionTitle) {
    const user = getCurrentUser();
    if (!user || !auth.currentUser) return;

    try {
        const reqId = auth.currentUser.uid + '_' + sectionId;
        await db.collection('subscriptionRequests').doc(reqId).set({
            userId: auth.currentUser.uid,
            userName: user.name || '',
            userEmail: user.email || '',
            userPhone: user.phone || '',
            sectionId: sectionId,
            sectionTitle: sectionTitle,
            status: 'pending',
            createdAt: new Date().toISOString()
        }, { merge: true });

        const msg = `أرغب في الاشتراك بقسم: ${sectionTitle}\nالاسم: ${user.name || ''}\nالبريد: ${user.email || ''}\nالهاتف: ${user.phone || ''}`;
        window.open('https://wa.me/' + SITE_CONTACT.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');

        document.getElementById('subscriptionModal')?.classList.remove('active');
        showToast('تم إرسال طلبك، سيتم تفعيل الاشتراك بعد المراجعة');
    } catch (e) {
        console.error(e);
        showToast('تعذّر إرسال الطلب، حاول مرة أخرى', 'error');
    }
}

/** تحميل صفحة القسم الرئيسي */
async function loadSectionPage() {
    const params = new URLSearchParams(window.location.search);
    const id = (typeof window.FIXED_SECTION_ID !== 'undefined')
        ? window.FIXED_SECTION_ID
        : parseInt(params.get('id'), 10);
    const section = sectionsData.find(s => s.id === id);

    const titleEl = document.getElementById('sectionPageTitle');
    const descEl = document.getElementById('sectionPageDesc');
    const listEl = document.getElementById('subSectionsPageList');
    const crumb = document.getElementById('sectionCrumb');
    const heroEl = document.querySelector('.page-hero');

    if (!section) {
        if (titleEl) titleEl.textContent = 'القسم غير موجود';
        return;
    }

    if (!canAccessSection(section.id)) {
        showToast('ليس لديك صلاحية لهذا القسم', 'warning');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    await refreshSectionSettingsCache();
    const settings = getSectionSettings();
    const st = settings[section.id] || {};

    // القسم مُعدّ لينقل لموقع خارجي — حتى لو دخل حد على الملف مباشرة برابطه
    if (st.linkType === 'external' && st.externalUrl) {
        window.location.href = st.externalUrl;
        return;
    }

    // القسم محمي بكود دخول: يظهر نموذج الكود أولاً قبل عرض الفرعيات
    if (st.linkType === 'code' && st.accessCode && !sessionStorage.getItem('sectionCodeOk_' + section.id)) {
        if (listEl) {
            listEl.innerHTML = `
                <div style="max-width:400px;margin:30px auto;text-align:center;">
                    <p style="margin-bottom:16px;color:var(--text-muted);">هذا القسم محمي بكود دخول</p>
                    <form id="sectionCodeForm">
                        <input type="text" id="sectionCodeInput" placeholder="أدخل الكود" style="width:100%;padding:12px;border-radius:8px;border:1px solid #ddd;margin-bottom:12px;text-align:center;">
                        <button type="submit" class="btn-primary" style="width:100%;padding:12px;border:none;border-radius:30px;cursor:pointer;">دخول</button>
                    </form>
                </div>
            `;
            document.getElementById('sectionCodeForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const entered = document.getElementById('sectionCodeInput').value.trim();
                if (entered === st.accessCode) {
                    sessionStorage.setItem('sectionCodeOk_' + section.id, '1');
                    loadSectionPage();
                } else {
                    showToast('الكود غير صحيح', 'error');
                }
            });
        }
        return;
    }

    // تطبيق الهوية البصرية الخاصة بهذا القسم (لون رئيسي مختلف لكل قسم)
    const accent = section.theme || 'var(--primary-blue)';
    if (heroEl) {
        heroEl.style.background = `linear-gradient(135deg, ${accent}, var(--primary-dark))`;
    }
    document.documentElement.style.setProperty('--section-accent', accent);

    if (titleEl) titleEl.textContent = section.title;
    if (descEl) descEl.textContent = section.desc;
    if (crumb) crumb.textContent = section.title;
    document.title = section.title + ' | Maana Therapy';

    if (!listEl) return;
    listEl.innerHTML = '';

    section.subs.forEach((sub, idx) => {
        const card = document.createElement('div');
        card.className = 'section-card program-card-full';
        const cover = (g.images && g.images[0]) ? g.images[0] : '';
        const badgeHtml = g.badge ? '<span class="program-age-badge"><i class="fas fa-seedling"></i> ' + g.badge + '</span>' : '';
        const introHtml = g.intro ? '<p class="program-intro">' + g.intro + '</p>' : '';
        const pointsHtml = (g.points && g.points.length)
            ? '<ul class="program-points">' + g.points.map(function (t) { return '<li><i class="fas fa-check"></i><span>' + t + '</span></li>'; }).join('') + '</ul>'
            : '';
        const videoHtml = g.videoUrl ? '<video class="program-card-video" controls playsinline preload="metadata" src="' + g.videoUrl + '"></video>' : '';
        card.innerHTML = `
            <div class="section-img" style="${cover ? '' : 'background:linear-gradient(135deg,var(--primary-blue),var(--primary-dark));'}">
                ${cover ? '<img src="' + cover + '" alt="' + g.title + '" class="section-cover-img">' : '<i class="fas fa-video"></i>'}
            </div>
            <div class="section-body program-card-body">
                <h3>${g.title}</h3>
                ${badgeHtml}
                ${g.desc ? '<p class="program-card-desc">' + g.desc + '</p>' : ''}
                ${introHtml}
                ${pointsHtml}
                ${videoHtml}
                <a href="https://wa.me/${PROGRAMS_CONFIG.whatsappNumber}?text=${encodeURIComponent('أرغب في حجز برنامج: ' + g.title)}" target="_blank" rel="noopener" class="program-book-btn program-card-wa"><i class="fab fa-whatsapp"></i> حجز عبر واتساب</a>
            </div>
        `;
        const coverImg = card.querySelector('.section-cover-img');
        if (coverImg) {
            coverImg.addEventListener('error', function () {
                const box = this.parentElement;
                this.remove();
                box.style.background = 'linear-gradient(135deg,var(--primary-blue),var(--primary-dark))';
                box.innerHTML = '<i class="fas fa-video"></i>';
            });
        }
        container.appendChild(card);
    });

    if (typeof initSectionCardsReveal === 'function') initSectionCardsReveal(container);
}

/** فتح نافذة تعرض تفاصيل البرنامج بعد الضغط على المربع الخاص به */
function openProgramModal(g) {
    let overlay = document.getElementById('programModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'programModalOverlay';
        overlay.className = 'program-modal-overlay';
        overlay.innerHTML = '<div class="program-modal" id="programModalBody"></div>';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeProgramModal();
        });
        document.body.appendChild(overlay);
    }

    const modalBody = document.getElementById('programModalBody');

    const galleryImgs = g.images.map(function (src, i) {
        return '<img src="' + src + '" alt="' + g.title + '"' + (i === 0 ? ' class="active"' : '') + '>';
    }).join('');

    const waMessage = encodeURIComponent('أرغب في حجز برنامج: ' + g.title);
    const waLink = 'https://wa.me/' + PROGRAMS_CONFIG.whatsappNumber + '?text=' + waMessage;

    // الفيديو اختياري (بعض البرامج صورة فقط)، والنقاط/الفئة العمرية اختيارية كذلك
    const videoHtml = g.videoUrl
        ? '<div class="program-video"><iframe src="' + g.videoUrl + '" title="' + g.title + '" allowfullscreen loading="lazy"></iframe></div>'
        : '';
    const introHtml = g.intro ? '<p class="program-intro">' + g.intro + '</p>' : '';
    const pointsHtml = (g.points && g.points.length)
        ? '<ul class="program-points">' + g.points.map(function (t) { return '<li><i class="fas fa-check"></i><span>' + t + '</span></li>'; }).join('') + '</ul>'
        : '';
    const badgeHtml = g.badge ? '<span class="program-age-badge"><i class="fas fa-seedling"></i> ' + g.badge + '</span>' : '';

    modalBody.innerHTML =
        '<button type="button" class="program-modal-close" aria-label="إغلاق">&times;</button>' +
        '<div class="program-gallery' + (g.videoUrl ? '' : ' program-gallery--full') + '">' + galleryImgs + '</div>' +
        videoHtml +
        '<div class="program-body">' +
        '<h3>' + g.title + '</h3>' +
        badgeHtml +
        '<p>' + g.desc + '</p>' +
        introHtml +
        pointsHtml +
        '<a href="' + waLink + '" target="_blank" class="program-book-btn"><i class="fab fa-whatsapp"></i> حجز</a>' +
        '</div>';

    modalBody.querySelector('.program-modal-close').addEventListener('click', closeProgramModal);

    // تحريك معرض الصور داخل النافذة
    const gallery = modalBody.querySelector('.program-gallery');
    const imgs = gallery.querySelectorAll('img');
    if (imgs.length > 1) {
        let i = 0;
        const timer = setInterval(function () {
            imgs[i].classList.remove('active');
            i = (i + 1) % imgs.length;
            imgs[i].classList.add('active');
        }, 2500);
        overlay.dataset.timerId = timer;
    }

    document.getElementById('programModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeProgramModal() {
    const overlay = document.getElementById('programModalOverlay');
    if (!overlay) return;
    if (overlay.dataset.timerId) {
        clearInterval(Number(overlay.dataset.timerId));
        delete overlay.dataset.timerId;
    }
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // نوقف تشغيل الفيديو بمسح ال iframe بعد انتهاء التأثير الحركي
    setTimeout(function () {
        const modalBody = document.getElementById('programModalBody');
        if (modalBody && !overlay.classList.contains('open')) modalBody.innerHTML = '';
    }, 300);
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeProgramModal();
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sectionsGrid')) renderSectionsGrid();
    if (document.getElementById('lecturesHubGrid')) renderLecturesHub();
    if (document.getElementById('subSectionsPageList')) loadSectionPage();
    if (document.getElementById('subContentArea')) loadSubSectionPage();
    initImageGalleries();
    initHomeVideo();
    initFAQ();
});
