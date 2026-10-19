/* ============================================================
   معالجة الصور من الجهاز — بدون Firebase Storage (مجاني بالكامل)
   الصور بتتصغّر وتتخزّن كنص (data URL) جوّه مستند Firestore نفسه.
   يُستخدم في: أغلفة البودكاست وصور الشهادات.
   الصوت/الفيديو بيتحطوا كروابط (يوتيوب / درايف / رابط مباشر).
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

/** يحوّل صورة لنص data URL صغير الحجم يتخزّن في Firestore. يرجّع { url, path } للتوافق مع الكود القديم */
function mnUploadFile(file, folder, onProgress) {
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
