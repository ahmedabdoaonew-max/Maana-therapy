/* ============================================
   نظام المصادقة - auth.js (Firebase Auth + Firestore)
   تسجيل الدخول، إنشاء حساب، إدارة الجلسات
   ملاحظة أمان: كلمات المرور لم تعد تُخزَّن أو تُقارَن يدوياً —
   Firebase Authentication يتولى ذلك بالكامل من طرف السيرفر.
   ============================================ */

// كاش محلي لعرض واجهة المستخدم فوراً فقط (ليس مصدر الحقيقة الأمني).
// أي تحقق حساس (الوصول لمحتوى مدفوع، صلاحيات الأدمن) يجب أن يعاد
// التحقق منه من Firestore Rules أو من Cloud Functions، وليس من هنا.
function _cacheUser(profile) {
    if (profile) {
        localStorage.setItem('currentUser', JSON.stringify(profile));
    } else {
        localStorage.removeItem('currentUser');
    }
}

// يبني نسخة "profile" من مستند Firestore الخاص بالمستخدم لتوافق باقي الصفحات
// (نفس الحقول القديمة: allowedSections, subscriptionType, isAdmin ...)
function _profileFromDoc(uid, data) {
    return {
        id: uid,
        uid: uid,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        allowedSections: data.allowedSections || [],
        allowedSubSections: data.allowedSubSections || [],
        subscriptionType: data.subscriptionType || 'free',
        paymentStatus: data.paymentStatus || 'unpaid',
        blocked: !!data.blocked,
        role: data.role || 'student',
        isAdmin: data.role === 'super_admin' || data.role === 'admin',
        referralCode: data.referralCode || '',
        rewardCredits: data.rewardCredits || 0,
        createdAt: data.createdAt || ''
    };
}

// يُستدعى تلقائياً عند أي تغيّر في حالة تسجيل الدخول (تحميل صفحة، دخول، خروج)
auth.onAuthStateChanged(async function (fbUser) {
    if (!fbUser) {
        _cacheUser(null);
        document.dispatchEvent(new CustomEvent('authReady', { detail: null }));
        return;
    }
    try {
        const doc = await db.collection('users').doc(fbUser.uid).get();
        if (!doc.exists) {
            // مستند المستخدم بيتنشئ تلقائياً بواسطة Cloud Function عند التسجيل
            // (onCreate trigger). لو لسه محصلش (تأخير بسيط)، نحاول مرة كمان.
            await new Promise(r => setTimeout(r, 1200));
            const retry = await db.collection('users').doc(fbUser.uid).get();
            if (!retry.exists) { _cacheUser(null); return; }
            const profile = _profileFromDoc(fbUser.uid, retry.data());
            _cacheUser(profile);
            document.dispatchEvent(new CustomEvent('authReady', { detail: profile }));
            return;
        }
        const data = doc.data();
        if (data.blocked) {
            showToast('تم حظر حسابك. تواصل مع الإدارة', 'error');
            await auth.signOut();
            _cacheUser(null);
            return;
        }
        const profile = _profileFromDoc(fbUser.uid, data);
        _cacheUser(profile);
        document.dispatchEvent(new CustomEvent('authReady', { detail: profile }));
        if (typeof updateHeaderAuth === 'function') updateHeaderAuth();
    } catch (e) {
        console.error('auth state error', e);
    }
});

// ========== تسجيل الدخول ==========
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }

    const btn = event.target.querySelector('.form-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الدخول...'; }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const doc = await db.collection('users').doc(cred.user.uid).get();
        const data = doc.exists ? doc.data() : {};

        if (data.blocked) {
            showToast('تم حظر حسابك. تواصل مع الإدارة', 'error');
            await auth.signOut();
            return;
        }

        const profile = _profileFromDoc(cred.user.uid, data);
        _cacheUser(profile);

        showToast(`مرحباً ${(profile.name || 'بك').split(' ')[0]}! تم تسجيل الدخول بنجاح`);

        setTimeout(() => {
            window.location.href = profile.isAdmin ? 'admin.html' : 'index.html';
        }, 800);
    } catch (err) {
        showToast(_authErrorMessage(err), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'دخول'; }
    }
}

// ========== إنشاء حساب ==========
async function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (!name || !email || !password) {
        showToast('يرجى ملء الحقول الأساسية', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    if (password !== confirm) {
        showToast('كلمتا المرور غير متطابقتين', 'error');
        return;
    }

    const btn = event.target.querySelector('.form-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الإنشاء...'; }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // ملف المستخدم في Firestore بيتنشئ مباشرة من العميل هنا (بدون Cloud Function)
        // القاعدة في firestore.rules بتسمح بالإنشاء فقط لو صاحب الحساب نفسه
        // وبشرط role = 'student' — يعني محدش يقدر يمنح نفسه صلاحية أدمن.
        const newUserData = {
            name,
            email,
            phone: phone || '',
            role: 'student',
            allowedSections: [],
            allowedSubSections: [],
            subscriptionType: 'free',
            paymentStatus: 'unpaid',
            blocked: false,
            referralCode: '',
            rewardCredits: 0,
            createdAt: new Date().toISOString()
        };
        // لو Cloud Function (onUserCreate) سبقت وأنشأت المستند، الإنشاء المباشر هيتحول
        // لتحديث وقواعد الأمان هترفضه — فنكتفي بتحديث الاسم والهاتف (المسموح بيهم).
        const userRef = db.collection('users').doc(cred.user.uid);
        try {
            await userRef.set(newUserData);
        } catch (e) {
            await userRef.update({ name, phone: phone || '' });
        }

        const profile = _profileFromDoc(cred.user.uid, newUserData);
        _cacheUser(profile);

        showToast('تم إنشاء الحساب بنجاح! مرحباً بك');
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);
    } catch (err) {
        showToast(_authErrorMessage(err), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'إنشاء حساب'; }
    }
}

// ========== تسجيل الخروج (تُستدعى من app.js أيضاً) ==========
async function firebaseLogout() {
    await auth.signOut();
    _cacheUser(null);
}

// ========== رسائل خطأ Firebase بالعربي ==========
function _authErrorMessage(err) {
    const map = {
        'auth/user-not-found': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/wrong-password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'هذا البريد الإلكتروني مسجل مسبقاً',
        'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/network-request-failed': 'تعذّر الاتصال بالخادم، تحقق من الإنترنت',
        'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً'
    };
    return map[err.code] || 'حدث خطأ، حاول مرة أخرى';
}

// ========== حماية الصفحات ==========
// تنبيه: تستخدم الكاش المحلي لتجربة استخدام سريعة فقط. لحماية حقيقية
// (مثل تشغيل فيديو مدفوع)، استخدم requireAuthAsync + Firestore Rules.
function requireAuth(redirect = 'login.html') {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = redirect;
        return false;
    }
    if (user.blocked) {
        _cacheUser(null);
        showToast('تم حظر حسابك', 'error');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// حماية قوية للوحة الأدمن: تتحقق من Firebase Auth + Firestore مباشرة (مش من localStorage)
async function requireAdmin() {
    return new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged(async (fbUser) => {
            unsub();

            if (!fbUser) {
                showToast('يجب تسجيل الدخول أولاً', 'error');
                window.location.href = 'login.html';
                return resolve(false);
            }

            try {
                const doc = await db.collection('users').doc(fbUser.uid).get();
                if (!doc.exists) {
                    showToast('غير مصرح لك بالدخول', 'error');
                    window.location.href = 'index.html';
                    return resolve(false);
                }

                const data = doc.data();
                const isAdmin = data.role === 'super_admin' || data.role === 'admin';

                if (!isAdmin) {
                    showToast('غير مصرح لك بالدخول', 'error');
                    window.location.href = 'index.html';
                    return resolve(false);
                }

                // تحديث الكاش بعد التحقق الحقيقي من السيرفر
                const profile = _profileFromDoc(fbUser.uid, data);
                _cacheUser(profile);
                resolve(true);

            } catch (err) {
                console.error(err);
                showToast('حدث خطأ في التحقق من الصلاحيات', 'error');
                window.location.href = 'index.html';
                resolve(false);
            }
        });
    });
}

// ========== نسخة آمنة (async) تتحقق من Firestore مباشرة وليس الكاش ==========
async function requireAuthAsync(redirect = 'login.html') {
    return new Promise((resolve) => {
        const unsub = auth.onAuthStateChanged(async (fbUser) => {
            unsub();
            if (!fbUser) { window.location.href = redirect; return resolve(false); }
            const doc = await db.collection('users').doc(fbUser.uid).get();
            const data = doc.exists ? doc.data() : {};
            if (data.blocked) {
                await auth.signOut();
                window.location.href = redirect;
                return resolve(false);
            }
            resolve(_profileFromDoc(fbUser.uid, data));
        });
    });
}
