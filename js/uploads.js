/* ============================================================
   معالجة الصور من الجهاز — بدون Firebase Storage (مجاني بالكامل)
   الصور بتتصغّر وتتخزّن كنص (data URL) جوّه مستند Firestore نفسه.
   يُستخدم في: أغلفة البودكاست وصور الشهادات.
   الشهادات بتترفع على Cloudinary (مجاني) لو متفعّل في js/storage-config.js، وإلا بتتخزّن مصغّرة في Firestore.
   الصوت/الفيديو (بودكاست / محاضرات) بيتحطوا كملفات جوه مجلد media بالمشروع.
   ============================================================ */

/** يصغّر الصور الكبيرة قبل الرفع (أسرع وأوفر). الملفات غير الصور تُرجع كما هي. */
function mnPrepareImage(file, maxSide, quality) {
    maxSide = maxSide || 1600;
    quality = quality || 0.86;
    if (!file || !/^image\//.test(file.type) || /svg|gif/.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
        var img = new Image();
        var url = URL.createObjectURL(file);
        img.onload = function () {
            URL.revokeObjectURL(url);
            var w = img.naturalWidth, h = img.naturalHeight;
            var scale = Math.min(1, maxSide / Math.max(w, h));
            if (scale === 1 && file.size < 900 * 1024) return resolve(file);
            var c = document.createElement('canvas');
            c.width = Math.round(w * scale);
            c.height = Math.round(h * scale);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            c.toBlob(function (blob) {
                if (!blob) return resolve(file);
                var name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
                resolve(new File([blob], name, { type: 'image/jpeg' }));
            }, 'image/jpeg', quality);
        };
        img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

/** يرفع صورة (شهادة / صورة متدرب) على Cloudinary لو متفعّل، وإلا يخزّنها مصغّرة داخل Firestore. يرجّع { url, path } */
function mnUploadFile(file, folder, onProgress) {
    if (/^(certificates|posters|psych-doctors|podcast)\//.test(folder || '') && typeof mnStorageReady === 'function' && mnStorageReady() && file && /^image\//.test(file.type)) {
        return mnPrepareImage(file, 1800, 0.88).then(function (small) { return mnCloudUpload(small, 'maana/' + folder, onProgress); }).then(function (r) { return { url: r.url, path: '' }; });
    }
    return mnUploadFileLocal(file, folder, onProgress);
}

/** يحوّل صورة لنص data URL صغير الحجم يتخزّن في Firestore. يرجّع { url, path } للتوافق مع الكود القديم */
function mnUploadFileLocal(file, folder, onProgress) {
    var maxBytes = /certificates\/images/.test(folder || '') ? 420 * 1024 : 150 * 1024;
    return new Promise(function (resolve, reject) {
        if (!file || !/^image\//.test(file.type)) {
            return reject(new Error('الملفات الصوتية والفيديو بتتضاف كرابط (يوتيوب / درايف / رابط مباشر)'));
        }
        var img = new Image();
        var src = URL.createObjectURL(file);
        img.onload = function () {
            URL.revokeObjectURL(src);
            var side = /certificates\/images/.test(folder || '') ? 1400 : 800;
            var q = 0.8, out = '';
            for (var i = 0; i < 8; i++) {
                var scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
                var c = document.createElement('canvas');
                c.width = Math.round(img.naturalWidth * scale);
                c.height = Math.round(img.naturalHeight * scale);
                var ctx = c.getContext('2d');
                ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
                ctx.drawImage(img, 0, 0, c.width, c.height);
                out = c.toDataURL('image/jpeg', q);
                if (out.length * 0.75 <= maxBytes) break;
                q = Math.max(0.4, q - 0.1); side = Math.round(side * 0.85);
            }
            if (out.length * 0.75 > maxBytes * 1.4) return reject(new Error('الصورة كبيرة جداً — اختار صورة أصغر'));
            if (onProgress) onProgress(1);
            resolve({ url: out, path: '' });
        };
        img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('تعذّر قراءة الصورة')); };
        img.src = src;
    });
}

/** (للتوافق) لا يوجد ملفات مخزّنة للحذف */
function mnDeleteFile() { return Promise.resolve(); }

/** مدة ملف صوت/فيديو بالثواني */
function mnMediaDuration(file) {
    return new Promise(function (resolve) {
        try {
            var el = document.createElement(/^video\//.test(file.type) ? 'video' : 'audio');
            var url = URL.createObjectURL(file);
            el.preload = 'metadata';
            el.onloadedmetadata = function () { URL.revokeObjectURL(url); resolve(isFinite(el.duration) ? Math.round(el.duration) : 0); };
            el.onerror = function () { URL.revokeObjectURL(url); resolve(0); };
            el.src = url;
        } catch (e) { resolve(0); }
    });
}

/** شريط تقدّم بسيط داخل عنصر */
function mnProgressUI(box) {
    if (!box) return { set: function () {}, done: function () {} };
    box.style.display = 'block';
    box.innerHTML = '<div style="height:8px;background:rgba(255,255,255,.12);border-radius:8px;overflow:hidden;margin-top:8px;"><div data-bar style="height:100%;width:0;background:#D5B477;transition:width .2s;"></div></div><div data-txt style="font-size:.8rem;margin-top:6px;opacity:.85;"></div>';
    var bar = box.querySelector('[data-bar]'), txt = box.querySelector('[data-txt]');
    return {
        set: function (p, label) { bar.style.width = Math.round(p * 100) + '%'; txt.textContent = (label || 'جاري الرفع') + ' ' + Math.round(p * 100) + '%'; },
        done: function (msg) { bar.style.width = '100%'; txt.textContent = msg || 'تم'; setTimeout(function () { box.style.display = 'none'; }, 1200); }
    };
}


/* ============ رفع الصور من الجهاز إلى Cloudinary (مجاني) — بيُستخدم للشهادات ============ */
function mnStorageReady() {
    var c = window.MN_CLOUDINARY || {};
    return !!(c.cloudName && c.uploadPreset);
}

/** يرفع صورة إلى Cloudinary ويرجّع { url, path }. onProgress(0..1) */
function mnCloudUpload(file, folder, onProgress) {
    return new Promise(function (resolve, reject) {
        var cfg = window.MN_CLOUDINARY || {};
        var fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', cfg.uploadPreset);
        if (folder) fd.append('folder', folder);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cfg.cloudName) + '/image/upload');
        xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        xhr.onload = function () {
            var res = {};
            try { res = JSON.parse(xhr.responseText); } catch (e) {}
            if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
                if (onProgress) onProgress(1);
                resolve({ url: res.secure_url, path: res.public_id || '' });
            } else {
                reject(new Error((res.error && res.error.message) || 'فشل رفع الصورة'));
            }
        };
        xhr.onerror = function () { reject(new Error('تعذّر الاتصال أثناء الرفع — تحقق من الإنترنت')); };
        xhr.send(fd);
    });
}


/** يرفع ملف صوت أو فيديو من الجهاز إلى Cloudinary (مجاني — حد الملف الواحد 100 ميجا). يرجّع { url, path, isVideo } */
var MN_MEDIA_MAX_MB = 100;
function mnCloudUploadMedia(file, folder, onProgress) {
    return new Promise(function (resolve, reject) {
        if (!file || !/^(audio|video)\//.test(file.type || '')) return reject(new Error('اختار ملف صوت أو فيديو'));
        if (file.size > MN_MEDIA_MAX_MB * 1024 * 1024) return reject(new Error('الملف أكبر من ' + MN_MEDIA_MAX_MB + ' ميجا — ضغّطه أو ارفعه على يوتيوب (غير مدرج) والصق الرابط'));
        if (!mnStorageReady()) return reject(new Error('فعّل Cloudinary من js/storage-config.js'));
        var cfg = window.MN_CLOUDINARY;
        var fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', cfg.uploadPreset);
        if (folder) fd.append('folder', folder);
        var xhr = new XMLHttpRequest();
        // الصوت والفيديو الاتنين بيترفعوا على resource_type = video في Cloudinary
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(cfg.cloudName) + '/video/upload');
        xhr.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        xhr.onload = function () {
            var res = {};
            try { res = JSON.parse(xhr.responseText); } catch (e) {}
            if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
                if (onProgress) onProgress(1);
                resolve({ url: res.secure_url, path: res.public_id || '', isVideo: /^video\//.test(file.type) });
            } else {
                reject(new Error((res.error && res.error.message) || 'فشل رفع الملف'));
            }
        };
        xhr.onerror = function () { reject(new Error('تعذّر الاتصال أثناء الرفع — تحقق من الإنترنت')); };
        xhr.send(fd);
    });
}
