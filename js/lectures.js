/* ============================================
   إدارة المحاضرات - lectures.js (Firestore + Cloud Function)
   عرض، التحقق من الكود عبر السيرفر، تشغيل الفيديو
   ============================================ */

// getLecturesAsync() الآن معرّفة في app.js (مشتركة مع admin.js/courses.js)

async function renderLectures(containerId = 'lecturesGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let lectures = {};
    try { lectures = await getLecturesAsync(); } catch (e) { console.error(e); }
    container.innerHTML = '';

    const activeLectures = Object.values(lectures).filter(l => l.active);

    if (activeLectures.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#666;grid-column:1/-1;">لا توجد محاضرات متاحة حالياً</p>';
        return;
    }

    activeLectures.forEach(lec => {
        const card = document.createElement('div');
        card.className = 'lecture-card';
        card.innerHTML = `
            <div class="lecture-thumb">
                <i class="fas fa-play-circle"></i>
            </div>
            <div class="lecture-body">
                <h3>${lec.title}</h3>
                <p style="font-size:0.8rem;color:#888;margin-bottom:6px;">الكود: <strong>${lec.id}</strong></p>
                <div class="lecture-price">${lec.price} ج.م</div>
                <p style="font-size:0.85rem;color:#666;margin-bottom:12px;">
                    مشاهدات مسموحة: ${lec.maxViews === 0 ? 'غير محدود' : lec.maxViews}
                </p>
                <button type="button" class="btn-primary" style="width:100%;padding:12px;border:none;border-radius:30px;cursor:pointer;"
                    onclick="startLectureAccess('${lec.id}')">
                    طلب مشاهدة
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function showAccessForm() {
    const formArea = document.getElementById('accessFormArea');
    if (!formArea) return;

    formArea.innerHTML = `
        <div class="auth-card" style="max-width:480px;margin:30px auto;">
            <h2>الدخول إلى المحاضرة</h2>
            <p class="subtitle">أدخل الكود واسمك الثلاثي لمشاهدة المحاضرة</p>
            <form onsubmit="accessLecture(event)">
                <div class="form-group">
                    <label>كود المحاضرة</label>
                    <input type="text" id="accessCode" placeholder="مثال: LEC-001" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label>الاسم الثلاثي</label>
                    <input type="text" id="accessName" placeholder="الاسم الكامل" required>
                </div>
                <button type="submit" class="form-submit">مشاهدة المحاضرة</button>
            </form>
        </div>
    `;
}

// ========== التحقق من الكود: قواعد Firestore هي اللي بتحمي رابط الفيديو (مفيش Functions) ==========
async function accessLecture(event) {
    event.preventDefault();
    const code = document.getElementById('accessCode').value.trim();
    const name = document.getElementById('accessName').value.trim();

    if (!code || !name) {
        showToast('يرجى إدخال الكود والاسم', 'error');
        return;
    }

    const btn = event.target.querySelector('.form-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري التحقق...'; }

    try {
        const data = await verifyLectureAccess(code, name);

        if (!data.success) {
            showToast(data.error || 'تعذّر التحقق من الكود', 'error');
            return;
        }

        sessionStorage.setItem('currentLecture', JSON.stringify({
            id: code.toUpperCase(),
            title: data.title,
            url: data.url,
            name: name
        }));

        showToast('تم التحقق بنجاح! جاري فتح المحاضرة...');
        setTimeout(() => { window.location.href = 'lecture.html'; }, 800);
    } catch (err) {
        console.error(err);
        showToast('تعذّر الاتصال بالخادم، حاول مرة أخرى', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'مشاهدة المحاضرة'; }
    }
}

/** استخراج معرف يوتيوب من أي شكل رابط */
function extractYouTubeId(url) {
    if (!url) return null;
    let m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    m = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
    if (m) return m[1];
    return null;
}

function loadLecturePlayer() {
    const data = sessionStorage.getItem('currentLecture');
    if (!data) {
        const titleEl = document.getElementById('lectureTitle');
        if (titleEl) titleEl.textContent = 'لا توجد محاضرة نشطة';
        const player = document.getElementById('videoPlayer');
        if (player) {
            player.innerHTML = `
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:20px;text-align:center;">
                    <i class="fas fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;opacity:0.8;"></i>
                    <p>يرجى إدخال كود المحاضرة أولاً من صفحة المحاضرات</p>
                    <a href="lectures.html" style="margin-top:16px;color:#81C784;font-weight:700;">الذهاب للمحاضرات</a>
                </div>`;
        }
        return;
    }

    const lecture = JSON.parse(data);
    const titleEl = document.getElementById('lectureTitle');
    const nameEl = document.getElementById('viewerName');
    const player = document.getElementById('videoPlayer');

    if (titleEl) titleEl.textContent = lecture.title;
    if (nameEl) nameEl.textContent = 'المشاهد: ' + lecture.name;

    if (!player) return;

    const url = (lecture.url || '').trim();
    const ytId = extractYouTubeId(url);

    if (ytId) {
        player.innerHTML = `
            <iframe
                src="https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1"
                title="${lecture.title.replace(/"/g, '')}"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                referrerpolicy="strict-origin-when-cross-origin"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
            </iframe>`;
    } else if (url.match(/\.(mp4|webm|ogg)(\?|$)/i) || url.includes('w3schools') || url.includes('blob:')) {
        player.innerHTML = `
            <video controls playsinline controlsList="nodownload"
                style="position:absolute;top:0;left:0;width:100%;height:100%;background:#000;"
                src="${url}">
                <source src="${url}" type="video/mp4">
                متصفحك لا يدعم تشغيل الفيديو
            </video>`;
    } else if (url) {
        player.innerHTML = `
            <iframe src="${url}"
                style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                allowfullscreen
                allow="autoplay; encrypted-media">
            </iframe>`;
    } else {
        player.innerHTML = `
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;">
                لا يوجد رابط فيديو لهذه المحاضرة
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lecturesGrid')) {
        renderLectures();
        showAccessForm();
    }
    if (document.getElementById('videoPlayer') || document.getElementById('lectureTitle')) {
        loadLecturePlayer();
    }
});
