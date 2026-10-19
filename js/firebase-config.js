/* ============================================
   إعدادات Firebase (خطة Spark المجانية — بدون Functions وبدون Storage)
   خدمات مستخدمة: Authentication (Email/Password) + Cloud Firestore فقط.
   ⚠ القيم الحالية لمشروع الأكاديمية الدولية — لو عايز مشروع منفصل ل«معنى» بدّلها بقيم مشروعك الجديد.
   القيم دي من: Firebase Console ← Project settings ← Your apps ← Web app (</>)
   ============================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDzGCHmgVCbG9-gzRjAl6HgKDTCg9rwJH8",
    authDomain: "academy-tabtabh.firebaseapp.com",
    projectId: "academy-tabtabh",
    messagingSenderId: "338036394030",
    appId: "1:338036394030:web:e64d10bf27e6533c9037bf"
};

// تهيئة Firebase (SDK النسخة المتوافقة compat — بدون أدوات بناء)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
