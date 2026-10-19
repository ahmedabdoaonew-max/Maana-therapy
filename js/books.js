/* ============================================================
   المكتبة التعليمية — عرض كتب (صورة + عنوان + وصف) مع طلب شراء
   يرسل بيانات العميل (الاسم + الهاتف) عبر واتساب لصاحب الموقع
   لإتمام التواصل وإرسال نسخة ال PDF يدوياً.
   يستخدم نفس Firebase الموجود في المشروع (js/firebase-config.js)
   ============================================================ */

/* ================= الواجهة العامة (books.html) ================= */
let booksState = { list: [], whatsappNumber: '' };

async function booksFetchPublicState() {
    const [snap, settingsDoc] = await Promise.all([
        db.collection('books').get(),
        db.collection('settings').doc('books').get(),
    ]);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    const whatsappNumber = settingsDoc.exists ? (settingsDoc.data().whatsappNumber || '') : '';
    return { list, whatsappNumber };
}

async function booksInitPublic() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        booksState = await booksFetchPublicState();
    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">تعذّر تحميل الكتب حالياً.</p>';
        return;
    }
    booksRenderGrid();
}

function booksRenderGrid() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;

    if (!booksState.list.length) {
        grid.innerHTML = '<p style="text-align:center;grid-column:1/-1;color:var(--text-muted);">لا توجد كتب متاحة حالياً.</p>';
        return;
    }

    grid.innerHTML = booksState.list.map(b => `
        <div class="book-card fade-in">
            <div class="book-cover">
                ${b.image ? `<img src="${b.image}" alt="${(b.title || '').replace(/"/g, '&quot;')}">` : '<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>'}
            </div>
            <div class="book-body">
                <h3>${b.title || ''}</h3>
                <p>${b.description || ''}</p>
                <button type="button" class="book-order-btn" onclick="booksOpenOrder('${b.id}')">
                    <i class="fab fa-whatsapp"></i> اطلب الكتاب
                </button>
            </div>
        </div>`).join('');
}

function booksOpenOrder(bookId) {
    const book = booksState.list.find(b => b.id === bookId);
    if (!book) return;
    const modal = document.getElementById('bookOrderModal');
    if (!modal) return;
    modal.dataset.bookId = bookId;
    document.getElementById('bookOrderTitle').textContent = book.title || '';
    document.getElementById('bookOrderName').value = '';
    document.getElementById('bookOrderPhone').value = '';
    const errBox = document.getElementById('bookOrderError');
    if (errBox) errBox.style.display = 'none';
    modal.classList.add('active');
}

function booksCloseOrder() {
    const modal = document.getElementById('bookOrderModal');
    if (modal) modal.classList.remove('active');
}

function booksSubmitOrder(event) {
    event.preventDefault();
    const modal = document.getElementById('bookOrderModal');
    const bookId = modal ? modal.dataset.bookId : null;
    const book = booksState.list.find(b => b.id === bookId);
    const name = document.getElementById('bookOrderName').value.trim();
    const phone = document.getElementById('bookOrderPhone').value.trim();
    const errBox = document.getElementById('bookOrderError');

    if (!name || !phone) {
        if (errBox) { errBox.textContent = 'من فضلك أدخل الاسم ورقم الهاتف.'; errBox.style.display = 'block'; }
        return;
    }
    const targetNumber = SITE_CONTACT.whatsapp;
    if (!targetNumber) {
        if (errBox) { errBox.textContent = 'لم يتم ضبط رقم واتساب الاستقبال بعد من الإدارة.'; errBox.style.display = 'block'; }
        return;
    }

    const text = `طلب شراء كتاب تعليمي (PDF)\nالكتاب: ${book ? book.title : ''}\nالاسم: ${name}\nرقم الهاتف: ${phone}`;
    window.open(`https://wa.me/${targetNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    booksCloseOrder();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('booksGrid')) booksInitPublic();
});

/* ================= لوحة الإدارة (admin.html) ================= */
let booksAdminData = null;

async function renderAdminBooks() {
    const wrap = document.getElementById('booksAdminWrap');
    if (!wrap) return;
    wrap.innerHTML = '<p style="color:var(--admin-text-muted);"><i class="fas fa-spinner fa-spin"></i> جاري التحميل...</p>';
    try {
        const [snap, sDoc] = await Promise.all([
            db.collection('books').get(),
            db.collection('settings').doc('books').get(),
        ]);
        booksAdminData = {
            list: snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)),
            whatsappNumber: sDoc.exists ? (sDoc.data().whatsappNumber || '') : '',
        };
    } catch (e) {
        console.error(e);
        wrap.innerHTML = '<p style="color:var(--admin-text-muted);">تعذّر تحميل البيانات.</p>';
        return;
    }
    booksRenderAdmin();
}

function booksRenderAdmin() {
    const wrap = document.getElementById('booksAdminWrap');
    if (!wrap || !booksAdminData) return;

    const itemsHtml = booksAdminData.list.map(b => `
        <details style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:10px;margin-bottom:10px;">
            <summary style="padding:12px 16px;cursor:pointer;color:var(--admin-text);display:flex;justify-content:space-between;align-items:center;">
                <span>${b.title || '(بدون عنوان)'}</span>
                <button type="button" title="حذف" class="btn-outline" style="padding:4px 8px;color:#e05656;" onclick="event.preventDefault();booksDeleteBook('${b.id}')"><i class="fas fa-trash"></i></button>
            </summary>
            <form onsubmit="booksSaveBook(event, '${b.id}')" style="padding:0 16px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group" style="grid-column:1/-1;"><label>عنوان الكتاب</label><input type="text" name="title" value="${(b.title || '').replace(/"/g, '&quot;')}" required></div>
                <div class="form-group" style="grid-column:1/-1;"><label>رابط صورة الغلاف</label><input type="text" name="image" value="${(b.image || '').replace(/"/g, '&quot;')}" placeholder="https://..."></div>
                <div class="form-group" style="grid-column:1/-1;"><label>وصف الكتاب</label><textarea name="description" rows="3">${b.description || ''}</textarea></div>
                <div class="form-group"><label>رقم واتساب خاص بهذا الكتاب (اختياري — إن تُرك فارغاً يُستخدم الرقم العام)</label><input type="text" name="whatsapp" value="${(b.whatsapp || '').replace(/"/g, '&quot;')}" placeholder="201152013172"></div>
                <div class="form-group"><label>ترتيب العرض</label><input type="number" name="order" value="${b.order || 0}"></div>
                <div class="form-group" style="align-self:end;"><button type="submit" class="form-submit">حفظ الكتاب</button></div>
            </form>
        </details>`).join('');

    wrap.innerHTML = `
        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-bottom:20px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">إضافة كتاب جديد</h3>
            <form onsubmit="booksAddBook(event)" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group" style="grid-column:1/-1;"><label>عنوان الكتاب</label><input type="text" name="title" required></div>
                <div class="form-group" style="grid-column:1/-1;"><label>رابط صورة الغلاف</label><input type="text" name="image" placeholder="https://..."></div>
                <div class="form-group" style="grid-column:1/-1;"><label>وصف الكتاب</label><textarea name="description" rows="3"></textarea></div>
                <div class="form-group"><label>رقم واتساب خاص بهذا الكتاب (اختياري — إن تُرك فارغاً يُستخدم الرقم العام)</label><input type="text" name="whatsapp" placeholder="201152013172"></div>
                <div class="form-group"><label>ترتيب العرض</label><input type="number" name="order" value="${booksAdminData.list.length + 1}"></div>
                <div class="form-group" style="align-self:end;"><button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">إضافة الكتاب</button></div>
            </form>
        </div>

        <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">الكتب الحالية (${booksAdminData.list.length})</h3>
        ${itemsHtml || '<p style="color:var(--admin-text-muted);">لا توجد كتب بعد.</p>'}

        <div style="background:var(--admin-panel-2);border:1px solid var(--admin-border);border-radius:12px;padding:20px;margin-top:24px;">
            <h3 style="color:var(--admin-text);margin-bottom:14px;font-size:1rem;">رقم واتساب استقبال طلبات شراء الكتب</h3>
            <form onsubmit="booksSaveWhatsapp(event)">
                <div class="form-group"><label>الرقم (بصيغة دولية بدون + مثال: 201152013172)</label><input type="text" id="booksWhatsappInput" value="${booksAdminData.whatsappNumber || ''}" placeholder="201152013172"></div>
                <button type="submit" class="form-submit" style="width:auto;padding:10px 24px;">حفظ الرقم</button>
            </form>
        </div>`;
}

async function booksAddBook(event) {
    event.preventDefault();
    const f = event.target;
    const data = {
        title: f.title.value.trim(),
        image: f.image.value.trim(),
        description: f.description.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        order: Number(f.order.value) || 0,
    };
    await db.collection('books').add(data);
    showToast('تم إضافة الكتاب');
    renderAdminBooks();
}

async function booksSaveBook(event, bookId) {
    event.preventDefault();
    const f = event.target;
    const patch = {
        title: f.title.value.trim(),
        image: f.image.value.trim(),
        description: f.description.value.trim(),
        whatsapp: f.whatsapp.value.trim(),
        order: Number(f.order.value) || 0,
    };
    await db.collection('books').doc(bookId).set(patch, { merge: true });
    showToast('تم حفظ الكتاب');
    renderAdminBooks();
}

async function booksDeleteBook(bookId) {
    if (!confirm('حذف هذا الكتاب؟')) return;
    await db.collection('books').doc(bookId).delete();
    showToast('تم الحذف');
    renderAdminBooks();
}

async function booksSaveWhatsapp(event) {
    event.preventDefault();
    const num = document.getElementById('booksWhatsappInput').value.trim();
    await db.collection('settings').doc('books').set({ whatsappNumber: num }, { merge: true });
    showToast('تم حفظ رقم واتساب');
}
