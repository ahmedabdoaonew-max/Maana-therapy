
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
        card.className = 'section-card';
        card.style.animationDelay = (idx * 0.12) + 's';
        card.style.borderTop = `4px solid ${accent}`;
        card.innerHTML = `
            <div class="section-img" style="background:linear-gradient(135deg, ${accent}, var(--primary-dark));">
                <i class="fas ${section.icon}"></i>
            </div>
            <div class="section-body">
                <span class="section-num" style="background:${accent};color:#fff;">${sub.id}</span>
                <h3>${sub.title}</h3>
                <p>${sub.desc}</p>
            </div>
        `;
        card.addEventListener('click', () => {
            window.location.href = 'subsection.html?section=' + section.id + '&sub=' + encodeURIComponent(sub.id);
        });
        listEl.appendChild(card);
    });
}

/** تحميل صفحة القسم الفرعي (جاهزة للمحتوى) */
async function loadSubSectionPage() {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get('group');
    const titleEl = document.getElementById('subPageTitle');
    const descEl = document.getElementById('subPageDesc');
    const parentLink = document.getElementById('parentSectionLink');
    const contentBox = document.getElementById('subContentArea');

    // وضع مجموعات المحاضرات الأونلاين
    if (groupId) {
        const groupNames = {
            G1: { title: 'الصحة النفسية وتعديل السلوك', desc: '10 محاضرات متخصصة' },
            G2: { title: 'الإرشاد الأسري والتربوي', desc: '10 محاضرات متخصصة' },
            G3: { title: 'تدريب المدربين TOT', desc: '10 محاضرات متخصصة' },
            G4: { title: 'إعداد القادة والتأهيل لتولي المناصب القيادية', desc: '10 محاضرات متخصصة' },
            G5: { title: 'التربية الخاصة', desc: '10 محاضرات متخصصة' },
            G6: { title: 'المنح المجانية (البرنامج الرئاسي: بداية جديدة لبناء الإنسان)', desc: '10 محاضرات متخصصة' }
        };
        const g = groupNames[groupId] || { title: 'محاضرات', desc: '' };
        if (titleEl) titleEl.textContent = g.title;
        if (descEl) descEl.textContent = g.desc;
        if (parentLink) { parentLink.textContent = 'المحاضرات الأونلاين'; parentLink.href = 'index.html#lecturesHub'; }
        document.title = g.title + ' | Maana Therapy';
        renderGroupLectures(groupId, contentBox, g);
        return;
    }

    const sectionId = parseInt(params.get('section'), 10);
    const subId = params.get('sub');
    const section = sectionsData.find(s => s.id === sectionId);
    const sub = section ? section.subs.find(x => x.id === subId) : null;

    if (!section || !sub) {
        if (titleEl) titleEl.textContent = 'المحتوى غير موجود';
        return;
    }

    if (!canAccessSection(section.id)) {
        showToast('ليس لديك صلاحية', 'warning');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
        return;
    }

    if (titleEl) titleEl.textContent = sub.title;
    if (descEl) descEl.textContent = sub.desc;
    if (parentLink) {
        parentLink.textContent = section.title;
        parentLink.href = 'section-' + section.id + '.html';
    }
    document.title = sub.title + ' | Maana Therapy';

    if (contentBox) {
        // الأقسام 1-13: صفحة محتوى جاهزة | القسم 14: قائمة محاضرات
        if (!section.isLecturesPackage && section.id !== 14) {
            contentBox.innerHTML = `
            <div class="content-ready-box">
                <i class="fas fa-pencil-alt"></i>
                <h3 style="color:var(--primary-dark);margin-bottom:8px;">${sub.title}</h3>
                <p style="color:var(--text-muted);margin-bottom:16px;">${sub.desc}</p>
                <p style="color:#888;font-size:0.95rem;line-height:1.8;">
                    هذه الصفحة جاهزة لإضافة المحتوى الخاص بك.<br>
                    <strong>معرّف القسم الفرعي:</strong> <code>${sub.id}</code>
                </p>
                <div style="margin-top:24px;">
                    <a href="section.html?id=${section.id}" class="btn-outline" style="padding:12px 24px;border-radius:30px;display:inline-flex;">
                        ← العودة للأقسام الفرعية
                    </a>
                </div>
            </div>`;
            return;
        }

        const allLecs = await getLecturesAsync();
        const hubSettings2 = await getLecturesHubSettings();
        const whatsappModeOn2 = hubSettings2.accessMode === 'whatsapp';
        const subLectures = Object.values(allLecs)
            .filter(l => l.subId === sub.id && l.active)
            .sort((a, b) => a.id.localeCompare(b.id));

        let lecturesHtml = subLectures.map(lec => {
            const accessLabel = whatsappModeOn2
                ? '<span class="badge badge-warning">موافقة عبر واتساب</span>'
                : lec.accessType === 'admin'
                ? '<span class="badge badge-warning">موافقة أدمن</span>'
                : lec.accessType === 'code'
                ? '<span class="badge badge-info">كود مخصص</span>'
                : '<span class="badge badge-success">شراء</span>';
            return `
                <div class="inner-lecture-row">
                    <div class="inner-lecture-info">
                        <strong>${lec.title}</strong>
                        <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                            ${accessLabel}
                            <span style="font-size:0.8rem;color:#888;">الكود: ${lec.id}</span>
                            <span style="font-size:0.9rem;font-weight:700;color:var(--primary-blue);">${lec.price} ج.م</span>
                        </div>
                    </div>
                    <div class="inner-lecture-actions">
                        <button type="button" class="btn-sm btn-view" onclick="startLectureAccess('${lec.id}')">مشاهدة / شراء</button>
                    </div>
                </div>`;
        }).join('');

        if (!lecturesHtml) {
            contentBox.innerHTML = '<div class="content-ready-box"><i class="fas fa-book-open"></i><h3 style="color:var(--primary-dark);">' + sub.title + '</h3><p style="color:var(--text-muted);">' + sub.desc + '</p><p style="color:#888;margin-top:12px;">محتوى هذا القسم جاهز للإضافة لاحقاً (دروس، ملفات، تمارين).<br><strong>المعرّف:</strong> ' + sub.id + '</p><a href="section-' + section.id + '.html" class="btn-outline" style="display:inline-block;margin-top:16px;padding:10px 20px;border-radius:30px;">← رجوع</a></div>';
            return;
        }

        contentBox.innerHTML = `
            <div class="sub-lectures-box">
                <div class="sub-lectures-header">
                    <div>
                        <h3 style="color:var(--primary-dark);margin:0 0 4px;">${sub.title}</h3>
                        <p style="color:var(--text-muted);margin:0;font-size:0.95rem;">${sub.desc}</p>
                    </div>
                    <span class="badge badge-info">${subLectures.length} محاضرة</span>
                </div>
                <div class="sub-lectures-list">
                    ${lecturesHtml}
                </div>
                <div style="margin-top:20px;">
                    <a href="section.html?id=${section.id}" class="btn-outline" style="padding:10px 20px;border-radius:30px;display:inline-flex;">
                        ← العودة للأقسام الفرعية
                    </a>
                </div>
            </div>
        `;
    }
}

// إعدادات وصول المحاضرات العامة (settings/lecturesHub) — تُقرأ مرة وتُخزَّن مؤقتاً
// لتفادي تكرار الطلب لكل ضغطة. الإدارة تتحكم فيها من لوحة التحكم.
let _lecturesHubSettingsCache = null;
async function getLecturesHubSettings() {
    if (_lecturesHubSettingsCache) return _lecturesHubSettingsCache;
    try {
        const doc = await db.collection('settings').doc('lecturesHub').get();
        _lecturesHubSettingsCache = doc.exists ? doc.data() : {};
    } catch (e) {
        _lecturesHubSettingsCache = {};
    }
    // كل المحاضرات بموافقة الإدارة عبر واتساب (الدفع الأونلاين غير مستخدم)
    _lecturesHubSettingsCache = Object.assign({}, _lecturesHubSettingsCache, { accessMode: 'whatsapp' });
    return _lecturesHubSettingsCache;
}

async function startLectureAccess(lectureId) {
    const lectures = await getLecturesAsync();
    const lec = lectures[lectureId];
    if (!lec) { showToast('المحاضرة غير موجودة', 'error'); return; }

    // لو الإدارة فعّلت "الموافقة عبر واتساب" فهي تحل محل الدفع/الكود لكل المحاضرات
    const hubSettings = await getLecturesHubSettings();
    if (hubSettings.accessMode === 'whatsapp') {
        requestAdminAccess(lec);
        return;
    }

    if (lec.accessType === 'code') { openCodeAccessModal(lec); return; }
    if (lec.accessType === 'admin') { requestAdminAccess(lec); return; }
    requestAdminAccess(lec);
}

function openCodeAccessModal(lec) {
    let overlay = document.getElementById('codeAccessModal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'codeAccessModal';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
    }
    overlay.innerHTML = `
        <div class="modal" style="max-width:440px;">
            <div class="modal-header">
                <h3>الدخول بكود مخصص</h3>
                <button class="modal-close" onclick="document.getElementById('codeAccessModal').classList.remove('active')">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom:12px;color:#666;">${lec.title}</p>
                <div class="form-group">
                    <label>كود المحاضرة</label>
                    <input type="text" id="customAccessCode" placeholder="أدخل الكود" style="text-transform:uppercase;">
                </div>
                <div class="form-group">
                    <label>الاسم الثلاثي</label>
                    <input type="text" id="customAccessName" placeholder="اسمك الكامل">
                </div>
                <button type="button" class="form-submit" onclick="submitCodeAccess('${lec.id}')">دخول</button>
            </div>
        </div>`;
    overlay.classList.add('active');
}

async function submitCodeAccess(lectureId) {
    const code = (document.getElementById('customAccessCode')?.value || '').trim().toUpperCase();
    const name = (document.getElementById('customAccessName')?.value || '').trim();
    if (!code || !name) { showToast('أدخل الكود والاسم', 'error'); return; }

    try {
        const data = await verifyLectureAccess(code, name, lectureId);
        if (!data.success) { showToast(data.error || 'تعذّر التحقق', 'error'); return; }

        sessionStorage.setItem('currentLecture', JSON.stringify({ id: lectureId, title: data.title, url: data.url, name }));
        document.getElementById('codeAccessModal')?.classList.remove('active');
        showToast('تم التحقق! جاري فتح المحاضرة...');
        setTimeout(() => { window.location.href = 'lecture.html'; }, 700);
    } catch (err) {
        console.error(err);
        showToast('تعذّر الاتصال، حاول مرة أخرى', 'error');
    }
}

async function requestAdminAccess(lec) {
    const user = getCurrentUser();
    if (!user) {
        showToast('سجّل الدخول أولاً لطلب موافقة الإدارة', 'warning');
        setTimeout(() => { window.location.href = 'login.html'; }, 1200);
        return;
    }
    try {
        const r = await requestLectureAccessClient(lec);
        if (!r.success) { showToast(r.error || 'حدث خطأ', 'error'); return; }

        if (r.status === 'approved') {
            const urlData = await getApprovedLectureClient(lec.id);
            if (!urlData.success) { showToast(urlData.error || 'حدث خطأ', 'error'); return; }
            sessionStorage.setItem('currentLecture', JSON.stringify({
                id: lec.id, title: urlData.title, url: urlData.url, name: user.name
            }));
            showToast('لديك موافقة! جاري فتح المحاضرة...');
            setTimeout(() => { window.location.href = 'lecture.html'; }, 700);
            return;
        }
        if (r.status === 'rejected') {
            showToast('تم رفض طلبك السابق — تواصل مع الإدارة', 'warning');
            return;
        }
        if (!r.isNew) {
            showToast('طلبك قيد المراجعة من الإدارة', 'warning');
            return;
        }

        // طلب جديد — نفتح واتساب مباشرة للتواصل مع الإدارة
        // وتسريع الموافقة، بدل ما العميل يستنى بدون أي إشعار.
        const hubSettings = await getLecturesHubSettings();
        const waNumber = SITE_CONTACT.whatsapp;
        if (waNumber) {
            const msg = 'مرحباً، أرغب في متابعة محاضرة "' + lec.title + '" (كود: ' + lec.id + ').' +
                '\nالاسم: ' + (user.name || '-') +
                '\nالبريد: ' + (user.email || '-') +
                (lec.price ? '\nالسعر: ' + lec.price + ' ج.م' : '');
            window.open('https://wa.me/' + waNumber + '?text=' + encodeURIComponent(msg), '_blank');
            showToast('تم إرسال طلبك، تابع معنا على واتساب لإتمام الموافقة', 'success');
        } else {
            showToast('تم إرسال طلب الموافقة للإدارة', 'success');
        }
    } catch (err) {
        console.error(err);
        showToast('تعذّر الاتصال بالخادم', 'error');
    }
}

/* معرض صور متحرك (صورتان لكل بطاقة كل ثانيتين) */
function initImageGalleries() {
    return; // الصور بقت معروضة تحت بعض بحجمها الكامل — مفيش تبديل تلقائي
    document.querySelectorAll('.gallery-card').forEach(card => {
        const imgs = card.querySelectorAll('img');
        if (imgs.length < 2) return;
        let i = 0;
        imgs[0].classList.add('active');
        setInterval(() => {
            imgs[i].classList.remove('active');
            i = (i + 1) % imgs.length;
            imgs[i].classList.add('active');
        }, 2000);
    });
}

/* فيديو الصفحة الرئيسية مع صورة مصغرة */
function initHomeVideo() {
    const wrap = document.getElementById('homeVideoWrap');
    if (!wrap) return;
    const btn = wrap.querySelector('.video-play-btn');
    const videoUrl = wrap.dataset.video || 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0';

    function play() {
        wrap.classList.add('playing');
        let embed = videoUrl;
        if (videoUrl.includes('youtube.com/watch')) {
            const m = videoUrl.match(/[?&]v=([^&]+)/);
            if (m) embed = 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0';
        } else if (videoUrl.includes('youtu.be/')) {
            const id = videoUrl.split('youtu.be/')[1].split('?')[0];
            embed = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
        }
        if (embed.includes('youtube') || embed.includes('youtu')) {
            wrap.innerHTML = `<iframe src="${embed}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else {
            wrap.innerHTML = `<video controls autoplay playsinline src="${videoUrl}"></video>`;
        }
    }
    if (btn) btn.addEventListener('click', play);
    wrap.addEventListener('click', function handler(e) {
        if (!wrap.classList.contains('playing')) play();
    });
}

/* الأسئلة الشائعة */
function initFAQ() {
    var section = document.querySelector('.faq-section');
    if (!section || section.dataset.faqBound === '1') return; // يمنع ربط الحدث أكثر من مرة (سبب مشكلة القطع والإغلاق المفاجئ)
    section.dataset.faqBound = '1';

    section.addEventListener('click', function (e) {
        var btn = e.target.closest('.faq-question');
        if (!btn || !section.contains(btn)) return;

        var item = btn.closest('.faq-item');
        var answer = item.querySelector('.faq-answer');
        var wasOpen = item.classList.contains('open');

        // اقفل باقي الأسئلة المفتوحة
        section.querySelectorAll('.faq-item.open').forEach(function (openItem) {
            if (openItem !== item) {
                openItem.classList.remove('open');
                var openAnswer = openItem.querySelector('.faq-answer');
                if (openAnswer) openAnswer.style.maxHeight = '0px';
            }
        });

        if (wasOpen) {
            item.classList.remove('open');
            answer.style.maxHeight = '0px';
        } else {
            item.classList.add('open');
            // نحسب الارتفاع الحقيقي للنص عشان الإجابة متتقطعش لو طويلة
            answer.style.maxHeight = (answer.scrollHeight + 20) + 'px';
        }
    });
}


/** إعدادات البرامج — عدّل الصور/الفيديو ورقم الواتساب من هنا بسهولة */
const PROGRAMS_CONFIG = {
    whatsappNumber: SITE_CONTACT.whatsapp, // رقم الواتساب لاستقبال طلبات الحجز
    groups: [
        {
            id: 'G1', title: 'الصحة النفسية وتعديل السلوك',
            desc: 'برنامج متخصص يزوّدك بالأدوات والأساليب العلمية الحديثة لفهم السلوك الإنساني، وتشخيص المشكلات النفسية والسلوكية، ووضع خطط علاجية وتعديلية فعّالة تناسب مختلف الفئات العمرية.',
            videoUrl: 'https://videotourl.com/videos/1784082422334-ae817570-5f5b-4547-aedf-ec9f8235571d.mp4',
            images: [
                'https://i.postimg.cc/90sgr1fK/IMG-20260714-WA0099.jpg?w=600&q=80',
                'https://i.postimg.cc/SssgdHY0/IMG-20260714-WA0106.jpg?w=600&q=80'
            ]
        },
        {
            id: 'G2', title: 'الإرشاد الأسري والتربوي',
            desc: 'برنامج يقدّم مهارات الإرشاد الأسري والتربوي للتعامل مع التحديات الأسرية، وبناء علاقات أسرية صحية، ودعم الوالدين والمربين في تنشئة أبنائهم بأساليب تربوية سليمة.',
            videoUrl: 'https://www.image2url.com/r2/default/videos/1784073451623-92b20533-c847-49bc-847a-f213e1171a7a.mp4',
            images: [
                'https://i.postimg.cc/8zfJR4zH/IMG-20260714-WA0095.jpg?w=600&q=80',
                'https://i.postimg.cc/d16LsS57/IMG-20260714-WA0067.jpg?w=600&q=80'
            ]
        },
        {
            id: 'G3', title: 'تدريب المدربين TOT',
            desc: 'برنامج معتمد لإعداد وتأهيل المدربين المحترفين، يغطي أساسيات ومهارات التدريب الفعّال، وتصميم الحقائب التدريبية، وإدارة قاعة التدريب، وأساليب العرض والتقييم.',
            videoUrl: 'https://videotourl.com/videos/1784081986745-5f1eea13-21d3-4218-8e7a-3eb8f74615f8.mp4',
            images: [
                'https://i.postimg.cc/prPzkF13/IMG-20260714-WA0092.jpg?w=600&q=80',
                'https://i.postimg.cc/RFKLg9Cc/IMG-20260714-WA0084.jpg?w=600&q=80'
            ]
        },
        {
            id: 'G4', title: 'إعداد القادة والتأهيل لتولي المناصب القيادية',
            desc: 'برنامج يهدف إلى صقل المهارات القيادية والإدارية، وإعداد الكوادر المؤهلة لتولي المناصب القيادية عبر تطوير مهارات اتخاذ القرار والتخطيط الاستراتيجي وإدارة الفرق.',
            videoUrl: 'https://videotourl.com/videos/1784079076779-9980f13e-7cb9-416e-ba2e-9ed8ab92ab9e.mp4',
            images: [
                'https://i.postimg.cc/Mpptqhtx/IMG-20260714-WA0072.jpg?w=600&q=80',
                'https://i.postimg.cc/T3t7bRhY/IMG-20260714-WA0098.jpg?w=600&q=80'
            ]
        },
        {
            id: 'G5', title: 'التربية الخاصة',
            desc: 'برنامج متخصص في أساليب التعامل مع ذوي الاحتياجات الخاصة، يقدّم استراتيجيات تعليمية وتأهيلية حديثة تدعم دمجهم وتنمية قدراتهم بما يحقق أفضل مستوى من الاستقلالية.',
            videoUrl: 'https://videotourl.com/videos/1784071587748-bbeb28f8-4aa5-4b6a-a0c1-1e2c090c2a4b.mp4',
            images: [
                'https://i.postimg.cc/TYyZf5PQ/IMG-20260714-WA0100.jpg.jpg?w=600&q=80',
                'https://i.postimg.cc/g0P9McmM/IMG-20260714-WA0081.jpg.jpg?w=600&q=80'
            ]
        },
        {
            id: 'G6', title: 'المنح المجانية (البرنامج الرئاسي: بداية جديدة لبناء الإنسان)',
            desc: 'مبادرة مجانية تمنح المستفيدين فرصة الالتحاق ببرامج تدريبية وتأهيلية متكاملة دون مقابل، ضمن رؤية شاملة لبناء الإنسان وتمكينه معرفياً ومهنياً.',
            videoUrl: 'https://www.image2url.com/r2/default/videos/1786295358259-701e607d-d4ab-4a58-afe5-1cf48a231a99.mp4',
            images: [
                'https://i.postimg.cc/RF6Hzj2k/IMG-20260715-WA0005.jpg?w=600&q=80',
                'https://i.postimg.cc/fRRkNG92/IMG-20260801-135203.png?w=600&q=80'
            ]
        },
        {
            id: 'G7', title: 'جلسات العلاج الزواجي والأسري',
            desc: 'علاقات أقوى بتبدأ بالفهم والحوار.. ساعد علاقتك تنمو في مساحة من التفاهم والاحترام.',
            intro: 'من خلال جلسات المتخصصة بنساعدك على:',
            points: [
                'التعامل مع الخلافات الزوجية والأسرية بطريقة صحية وفعّالة.',
                'تقوية الروابط العاطفية وتعزيز التواصل، الثقة والاحترام المتبادل.'
            ],
            images: ['images/programs/marital-family.jpg']
        },
        {
            id: 'G8', title: 'دعم الأطفال والمراهقين',
            desc: 'كل مرحلة عمرية ليها تحدياتها، وفي «معنى» بنوفر مساحة آمنة تساعد الأطفال والمراهقين يفهموا مشاعرهم، ويعبّروا عن نفسهم، ويكتسبوا مهارات تساعدهم يتعاملوا مع المواقف اليومية بثقة ووعي.',
            points: [
                'جلسات نفسية مناسبة لكل مرحلة عمرية.',
                'تنمية المهارات العاطفية والاجتماعية.',
                'إرشاد ودعم للوالدين.'
            ],
            badge: 'تحت الـ 20 عام',
            images: ['images/programs/kids-teens.jpg']
        },
        {
            id: 'G9', title: 'جلسات التخاطب، التربية الخاصة وتنمية المهارات',
            desc: 'بنساعد الأطفال على تنمية مهارات التواصل واللغة، وتحسين الانتباه والتركيز، واكتساب المهارات الحياتية والاجتماعية، مع دعم تعديل السلوك بما يتناسب مع احتياجات كل طفل.',
            images: ['images/programs/speech-special-skills.jpg']
        }
    ]
};

/** شبكة بطاقات البرامج (3 في الصف بنفس شكل شبكة الأقسام) — بالضغط على البطاقة يظهر البرنامج كاملاً (فيديو + صورة متحركة + حجز واتساب) */
function renderLecturesHub(containerId) {
    const container = document.getElementById(containerId || 'lecturesHubGrid');
    if (!container) return;

    container.innerHTML = '';
    // data-groups="G7,G8,G9" على الحاوية = عرض هذه البرامج فقط وبنفس الترتيب
    const wanted = (container.getAttribute('data-groups') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    const list = wanted.length
        ? wanted.map(function (id) { return PROGRAMS_CONFIG.groups.find(function (x) { return x.id === id; }); }).filter(Boolean)
        : PROGRAMS_CONFIG.groups;
    list.forEach(function (g, idx) {
        const card = document.createElement('div');
        card.className = 'section-card program-card-full revealed';
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

    /* البطاقات ظاهرة مباشرة (class revealed) */
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
