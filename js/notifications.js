/* ============================================
   نظام الإشعارات - notifications.js
   جرس إشعارات في الهيدر + قائمة منسدلة + علامة "مقروء"
   ============================================ */

let _notifUnsub = null;

function initNotificationBell() {
    document.addEventListener('authReady', (e) => {
        const user = e.detail;
        if (_notifUnsub) { _notifUnsub(); _notifUnsub = null; }
        if (!user) {
            _renderNotifBadge(0);
            return;
        }
        _notifUnsub = db.collection('notifications')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .onSnapshot((snap) => {
                const items = [];
                snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
                _renderNotifList(items);
                _renderNotifBadge(items.filter(n => !n.read).length);
            }, (err) => console.error('[notifications]', err));
    });
}

function _renderNotifBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function _renderNotifList(items) {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (!items.length) {
        list.innerHTML = '<p style="text-align:center;color:#888;padding:20px;font-size:0.9rem;">لا توجد إشعارات بعد</p>';
        return;
    }

    list.innerHTML = items.map(n => {
        const date = n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString('ar-EG') : '';
        return `
            <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
                <p>${n.message || ''}</p>
                <span>${date}</span>
            </div>
        `;
    }).join('');
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.toggle('active');
}

async function markNotificationRead(id) {
    try {
        await db.collection('notifications').doc(id).update({ read: true });
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('notifBadge')) initNotificationBell();

    document.addEventListener('click', (e) => {
        const panel = document.getElementById('notifPanel');
        const bellBtn = document.getElementById('notifBellBtn');
        if (panel && panel.classList.contains('active') &&
            !panel.contains(e.target) && e.target !== bellBtn && !bellBtn?.contains(e.target)) {
            panel.classList.remove('active');
        }
    });
});
