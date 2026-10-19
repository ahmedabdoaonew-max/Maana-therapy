/**
 * القسم الديني - religious.js
 * متوافق مع النظام المركزي (addPoints, notifications, dark mode, reduce motion)
 * لا يعدل على الملفات المركزية
 */

(function () {
  'use strict';

  // ========== المفاتيح والبيانات ==========
  const STORAGE_KEY = 'wellnessApp_religious';
  const CENTRAL_KEY = 'wellnessAppData'; // إن وُجد النظام المركزي

  const DEFAULT_DATA = {
    lastChallengeDate: null,
    completedDates: [],
    completedTasksToday: [],
    completedAthkarToday: [],
    lastQuranSurah: null,
    lastQuranAyah: null,
    lastQuranDate: null,
    pagesReadToday: 0,
    totalPagesRead: 0,
    city: null,
    country: null,
    calculationMethod: 4,
    adhanEnabled: true,
    notificationsEnabled: true,
    claimedStreakRewards: [],
    unlockedAchievements: [],
    quranGoal: 1,
    quranSurahProgress: {},
    quranReciter: 'ar.alafasy',
    currentAthkarCat: 'morning'
  };

  const DEFAULT_STATS = {
    religiousTasksCompleted: 0,
    athkarGroupsCompleted: 0,
    quranPagesRead: 0,
    religiousStreak: 0,
    longestReligiousStreak: 0
  };

  // ========== بيانات الأذكار ==========
  const ATHKAR = {
    morning: [
      { id: 'm1', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ...', count: 1 },
      { id: 'm2', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', count: 1 },
      { id: 'm3', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', count: 100 },
      { id: 'm4', text: 'لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 10 },
      { id: 'm5', text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', count: 3 },
      { id: 'm6', text: 'بِسْمِ اللهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3 },
      { id: 'm7', text: 'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ...', count: 4 },
      { id: 'm8', text: 'رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', count: 3 }
    ],
    evening: [
      { id: 'e1', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ...', count: 1 },
      { id: 'e2', text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', count: 1 },
      { id: 'e3', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', count: 100 },
      { id: 'e4', text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', count: 3 },
      { id: 'e5', text: 'بِسْمِ اللهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', count: 3 },
      { id: 'e6', text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّةِ مِنْ غَضَبِهِ وَعِقَابِهِ، وَشَرِّ عِبَادِهِ...', count: 3 }
    ],
    'after-prayer': [
      { id: 'ap1', text: 'أَسْتَغْفِرُ اللهَ (ثلاثاً) اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ...', count: 1 },
      { id: 'ap2', text: 'سُبْحَانَ اللهِ', count: 33 },
      { id: 'ap3', text: 'الْحَمْدُ لِلَّهِ', count: 33 },
      { id: 'ap4', text: 'اللهُ أَكْبَرُ', count: 33 },
      { id: 'ap5', text: 'لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1 }
    ],
    sleep: [
      { id: 's1', text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', count: 1 },
      { id: 's2', text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', count: 3 },
      { id: 's3', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', count: 33 },
      { id: 's4', text: 'الْحَمْدُ لِلَّهِ', count: 33 },
      { id: 's5', text: 'اللهُ أَكْبَرُ', count: 34 },
      { id: 's6', text: 'آية الكرسي: اللهُ لاَ إِلَهَ إِلاَّ هُوَ الْحَيُّ الْقَيُّومُ...', count: 1 }
    ],
    wake: [
      { id: 'w1', text: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', count: 1 },
      { id: 'w2', text: 'لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', count: 1 }
    ],
    food: [
      { id: 'f1', text: 'بِسْمِ اللهِ', count: 1 },
      { id: 'f2', text: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', count: 1 },
      { id: 'f3', text: 'اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَأَطْعِمْنَا خَيْرًا مِنْهُ', count: 1 }
    ],
    home: [
      { id: 'h1', text: 'بِسْمِ اللهِ، تَوَكَّلْتُ عَلَى اللهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللهِ (عند الخروج)', count: 1 },
      { id: 'h2', text: 'بِسْمِ اللهِ وَلَجْنَا، وَبِسْمِ اللهِ خَرَجْنَا، وَعَلَى اللهِ رَبِّنَا تَوَكَّلْنَا (عند الدخول)', count: 1 },
      { id: 'h3', text: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ (عند دخول الخلاء)', count: 1 },
      { id: 'h4', text: 'غُفْرَانَكَ (عند الخروج من الخلاء)', count: 1 }
    ],
    general: [
      { id: 'g1', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ', count: 100 },
      { id: 'g2', text: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ', count: 100 },
      { id: 'g3', text: 'لاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللهِ', count: 100 },
      { id: 'g4', text: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ', count: 100 },
      { id: 'g5', text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ', count: 100 },
      { id: 'g6', text: 'لاَ إِلَهَ إِلاَّ اللهُ', count: 100 }
    ],
    duas: [
      { id: 'd1', text: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ', count: 1 },
      { id: 'd2', text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ', count: 1 },
      { id: 'd3', text: 'يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ', count: 1 },
      { id: 'd4', text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ', count: 1 },
      { id: 'd5', text: 'رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ', count: 1 }
    ]
  };

  const GROUP_NAMES = {
    morning: 'أذكار الصباح',
    evening: 'أذكار المساء',
    'after-prayer': 'أذكار بعد الصلاة',
    sleep: 'أذكار النوم',
    wake: 'أذكار الاستيقاظ',
    food: 'أذكار الطعام',
    home: 'أذكار المنزل والخلاء',
    general: 'الأذكار العامة',
    duas: 'الأدعية المأثورة'
  };

  // ========== المهام اليومية ==========
  const DAILY_TASKS = [
    { id: 'fajr', title: 'صلاة الفجر في وقتها', points: 15, required: true },
    { id: 'morning-athkar', title: 'أذكار الصباح', points: 10, required: true },
    { id: 'quran-wird', title: 'قراءة ورد من القرآن', points: 12, required: true },
    { id: 'duha', title: 'صلاة الضحى (اختياري)', points: 8, required: false },
    { id: 'evening-athkar', title: 'أذكار المساء', points: 10, required: true },
    { id: 'tasbih', title: 'التسبيح (33×3)', points: 8, required: true },
    { id: 'istighfar', title: 'الاستغفار 100 مرة', points: 10, required: true },
    { id: 'salawat', title: 'الصلاة على النبي ﷺ', points: 8, required: true },
    { id: 'parents', title: 'بر الوالدين / صلة رحم (تذكير)', points: 5, required: false },
    { id: 'sadaqa', title: 'صدقة ولو قليلة (تذكير)', points: 5, required: false },
    { id: 'witr', title: 'قيام ليل أو وتر (تذكير)', points: 10, required: false }
  ];

  // ========== الإنجازات ==========
  const ACHIEVEMENTS = [
    { id: 'first-wird', icon: '🌱', title: 'أول ورد', desc: 'أكملت أول مهمة دينية', condition: (s) => s.religiousTasksCompleted >= 1 },
    { id: 'morning-done', icon: '📿', title: 'أذكار الصباح', desc: 'أتممت أذكار الصباح', condition: (s, d) => (d.completedAthkarToday || []).includes('morning') || (d.unlockedAchievements || []).includes('morning-done') },
    { id: 'evening-done', icon: '🌙', title: 'أذكار المساء', desc: 'أتممت أذكار المساء', condition: (s, d) => (d.completedAthkarToday || []).includes('evening') || (d.unlockedAchievements || []).includes('evening-done') },
    { id: 'surah-done', icon: '📖', title: 'ختمت سورة', desc: 'أكملت قراءة سورة كاملة', condition: (s, d) => (d.unlockedAchievements || []).includes('surah-done') },
    { id: 'streak-7', icon: '🔥', title: '7 أيام متتالية', desc: 'سلسلة التزام أسبوع', condition: (s) => s.religiousStreak >= 7 },
    { id: 'streak-30', icon: '💎', title: '30 يومًا', desc: 'شهر كامل من الالتزام', condition: (s) => s.religiousStreak >= 30 },
    { id: 'points-500', icon: '🏆', title: '500 نقطة', desc: 'وصلت إلى 500 نقطة دينية', condition: (s, d, pts) => pts >= 500 },
    { id: 'athkar-10', icon: '✨', title: '10 مجموعات أذكار', desc: 'أتممت 10 مجموعات', condition: (s) => s.athkarGroupsCompleted >= 10 },
    { id: 'quran-50', icon: '📚', title: '50 صفحة', desc: 'قرأت 50 صفحة من القرآن', condition: (s) => s.quranPagesRead >= 50 }
  ];

  // ========== القرآن الكريم — نص كامل حقيقي (114 سورة) ==========
  // مخزّن محليًا بالكامل جوه الموقع (data/quran/) — صفر اعتماد على أي
  // API خارجي وقت القراءة. ده بيحل مشكلة التعليق نهائيًا مهما كانت حالة
  // الشبكة، لأن الملفات دي بتتحمل من نفس أوريجن الموقع وبتتخزن Offline
  // مع ال service worker زي أي ملف تاني في الموقع.
  // النص برواية حفص بالرسم العثماني. الصوت لسه بيتشغل Streaming من شبكة
  // islamic.network (ميزة تانية، أقل حساسية من فشل النص).
  const QURAN_DATA_BASE = 'data/quran/';
  const QURAN_AUDIO_HOST = 'https://cdn.islamic.network/quran/audio-surah/128/';
  const DEFAULT_RECITER = 'ar.alafasy';
  const RECITERS = [
    { id: 'ar.alafasy', name: 'مشاري راشد العفاسي' },
    { id: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد (مرتّل)' },
    { id: 'ar.husary', name: 'محمود خليل الحصري' },
    { id: 'ar.minshawi', name: 'محمد صديق المنشاوي' },
    { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
    { id: 'ar.mahermuaiqly', name: 'ماهر المعيقلي' }
  ];
  function quranAudioUrl(surahNumber) {
    const reciter = data.quranReciter || DEFAULT_RECITER;
    return `${QURAN_AUDIO_HOST}${reciter}/${surahNumber}.mp3`;
  }
  let SURAHS = [];
  let quranListLoading = false;
  let quranModalTargetSurah = null;

  function loadSurahListCache() {
    try {
      const raw = localStorage.getItem('quranSurahListCache_v2');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  async function fetchSurahList() {
    const cached = loadSurahListCache();
    if (cached && cached.length === 114) { SURAHS = cached; return true; }
    if (quranListLoading) return false;
    quranListLoading = true;
    try {
      const res = await fetch(QURAN_DATA_BASE + 'index.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const list = await res.json();
      if (!Array.isArray(list) || list.length !== 114) throw new Error('قائمة سور غير مكتملة');
      SURAHS = list.map(s => ({ number: s.number, name: s.name, ayahs: s.ayahs, ayahsText: null }));
      localStorage.setItem('quranSurahListCache_v2', JSON.stringify(SURAHS));
      return true;
    } catch (e) {
      console.error('تعذّر تحميل قائمة السور', e);
      return false;
    } finally {
      quranListLoading = false;
    }
  }

  function loadSurahTextCache(number) {
    try {
      const raw = localStorage.getItem('quranSurahText_v2_' + number);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  async function fetchSurahText(surah) {
    const cached = loadSurahTextCache(surah.number);
    if (cached) { surah.ayahsText = cached; return; }

    const res = await fetch(QURAN_DATA_BASE + surah.number + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json || !Array.isArray(json.ayahs) || !json.ayahs.length) {
      throw new Error('تعذّر تحميل نص السورة');
    }
    surah.ayahsText = json.ayahs;
    if (json.name) surah.name = json.name;
    try {
      localStorage.setItem('quranSurahText_v2_' + surah.number, JSON.stringify(json.ayahs));
    } catch (e) { /* الكاش اختياري فقط، البيانات نفسها محلية أصلاً */ }
  }

  // ========== الحالة ==========
  let data = { ...DEFAULT_DATA };
  let stats = { ...DEFAULT_STATS };
  let sectionPoints = 0;
  let currentSurah = null;
  let currentAyahIndex = 0;
  let athkarCounters = {};
  let prayerTimes = null;
  let countdownInterval = null;
  let adhanPlayedToday = {};

  // ========== أدوات مساعدة ==========
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function loadData() {
    try {
      // محاولة قراءة من النظام المركزي أولاً
      const central = localStorage.getItem(CENTRAL_KEY);
      if (central) {
        const parsed = JSON.parse(central);
        if (parsed.religious) data = { ...DEFAULT_DATA, ...parsed.religious };
        if (parsed.stats) {
          stats = {
            religiousTasksCompleted: parsed.stats.religiousTasksCompleted || 0,
            athkarGroupsCompleted: parsed.stats.athkarGroupsCompleted || 0,
            quranPagesRead: parsed.stats.quranPagesRead || 0,
            religiousStreak: parsed.stats.religiousStreak || 0,
            longestReligiousStreak: parsed.stats.longestReligiousStreak || 0
          };
        }
        if (parsed.sections && parsed.sections.religious != null) {
          sectionPoints = parsed.sections.religious;
        }
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          data = { ...DEFAULT_DATA, ...parsed.data };
          stats = { ...DEFAULT_STATS, ...parsed.stats };
          sectionPoints = parsed.sectionPoints || 0;
        }
      }
    } catch (e) {
      console.warn('Religious load error', e);
    }
    // إعادة تعيين المهام والأذكار اليومية إن كان يوم جديد
    resetDailyIfNeeded();
  }

  function saveData() {
    try {
      const central = localStorage.getItem(CENTRAL_KEY);
      if (central) {
        const parsed = JSON.parse(central);
        parsed.religious = data;
        parsed.stats = { ...(parsed.stats || {}), ...stats };
        if (!parsed.sections) parsed.sections = {};
        parsed.sections.religious = sectionPoints;
        localStorage.setItem(CENTRAL_KEY, JSON.stringify(parsed));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, stats, sectionPoints }));
      }
    } catch (e) {
      console.warn('Religious save error', e);
    }
  }

  function resetDailyIfNeeded() {
    const today = todayStr();
    if (data.lastChallengeDate !== today) {
      // تحديث الستريك
      if (data.lastChallengeDate) {
        const last = new Date(data.lastChallengeDate);
        const now = new Date(today);
        const diff = Math.round((now - last) / 86400000);
        if (diff === 1) {
          // استمرارية
        } else if (diff > 1) {
          stats.religiousStreak = 0;
        }
      }
      data.completedTasksToday = [];
      data.completedAthkarToday = [];
      data.pagesReadToday = 0;
      data.lastChallengeDate = today;
      adhanPlayedToday = {};
      saveData();
    }
  }

  function addPoints(points, reason) {
    if (points <= 0) return;
    sectionPoints += points;
    // استدعاء النظام المركزي إن وُجد
    if (typeof window.addPoints === 'function') {
      window.addPoints('religious', points, reason);
    }
    // تحديث totalPoints إن وُجد
    try {
      const central = localStorage.getItem(CENTRAL_KEY);
      if (central) {
        const parsed = JSON.parse(central);
        parsed.totalPoints = (parsed.totalPoints || 0) + points;
        if (!parsed.sections) parsed.sections = {};
        parsed.sections.religious = sectionPoints;
        localStorage.setItem(CENTRAL_KEY, JSON.stringify(parsed));
      }
    } catch (e) {}
    saveData();
    updateNavPoints();
    checkAchievements();
    showToast(`+${points} نقطة — ${reason}`);
  }

  function showToast(msg) {
    // استخدام النظام المركزي إن وُجد
    if (typeof window.showNotification === 'function') {
      window.showNotification(msg);
      return;
    }
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 2800);
  }

  function updateNavPoints() {
    const el = document.querySelector('#nav-points .points-value');
    if (el) el.textContent = sectionPoints;
  }

  // ========== الستريك ==========
  function recordActivity() {
    const today = todayStr();
    if (!data.completedDates.includes(today)) {
      data.completedDates.push(today);
      // الحفاظ على آخر 60 يوم فقط
      if (data.completedDates.length > 60) data.completedDates = data.completedDates.slice(-60);

      if (data.lastChallengeDate === today || !data.lastChallengeDate) {
        // نفس اليوم أو أول مرة
      }
      // حساب الستريك
      let streak = 0;
      let d = new Date(today);
      while (true) {
        const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (data.completedDates.includes(s)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else break;
      }
      stats.religiousStreak = streak;
      if (streak > stats.longestReligiousStreak) {
        stats.longestReligiousStreak = streak;
      }
      // مكافآت السلسلة
      const rewards = [
        { days: 3, pts: 30 },
        { days: 7, pts: 70 },
        { days: 14, pts: 150 },
        { days: 30, pts: 300 }
      ];
      rewards.forEach(r => {
        if (streak >= r.days && !data.claimedStreakRewards.includes(r.days)) {
          data.claimedStreakRewards.push(r.days);
          addPoints(r.pts, `سلسلة ${r.days} أيام`);
          showToast(`🔥 سلسلة جديدة! ${r.days} أيام من الالتزام`);
        }
      });
      saveData();
    }
  }

  // ========== الإنجازات ==========
  function checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
      if (data.unlockedAchievements.includes(ach.id)) return;
      if (ach.condition(stats, data, sectionPoints)) {
        data.unlockedAchievements.push(ach.id);
        saveData();
        showToast(`🏆 إنجاز جديد: ${ach.title}`);
        // استدعاء نظام الإنجازات المركزي إن وُجد
        if (typeof window.unlockAchievement === 'function') {
          window.unlockAchievement(ach.id, ach.title);
        }
      }
    });
    renderAchievements();
  }

  // ========== واجهة المستخدم ==========
  // كل قسم له صفحة مستقلة
  const SECTION_PAGES = {
    quran: 'quran.html',
    athkar: 'athkar.html',
    tasks: 'daily-wird.html',
    prayer: 'prayer-times.html',
    progress: 'progress.html',
    achievements: 'achievements.html'
  };
  const HUB_PAGE = 'mental-health.html';

  function openSection(id) {
    if (SECTION_PAGES[id]) window.location.href = SECTION_PAGES[id];
  }

  // يعرض لوحة القسم الموجودة في الصفحة الحالية ويرسم محتواها
  function showPanel(id) {
    document.querySelectorAll('.mh-panel').forEach(p => p.hidden = true);
    const panel = document.getElementById('panel-' + id);
    if (panel) panel.hidden = false;
    if (id === 'athkar') renderAthkar();
    if (id === 'quran') renderQuran();
    if (id === 'tasks') renderTasks();
    if (id === 'prayer') renderPrayer();
    if (id === 'progress') renderProgress();
    if (id === 'achievements') renderAchievements();
  }

  // ========== الأذكار ==========
  function renderAthkar() {
    const cat = data.currentAthkarCat || 'morning';
    document.querySelectorAll('.athkar-cat').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
    });
    const list = document.getElementById('athkar-list');
    const items = ATHKAR[cat] || [];
    const completedToday = data.completedAthkarToday || [];
    const groupDone = completedToday.includes(cat);

    list.innerHTML = items.map(item => {
      const key = cat + '_' + item.id;
      if (athkarCounters[key] == null) athkarCounters[key] = 0;
      const current = athkarCounters[key];
      const done = current >= item.count || groupDone;
      return `
        <div class="athkar-item ${done ? 'completed' : ''}" data-id="${item.id}">
          <div class="athkar-text">${item.text}</div>
          <div class="athkar-controls">
            <span class="athkar-count-info">المطلوب: ${item.count} مرة</span>
            <div class="counter-group">
              <button class="counter-btn" data-action="minus" data-key="${key}" ${done ? 'disabled' : ''}>−</button>
              <span class="counter-value">${current}</span>
              <button class="counter-btn" data-action="plus" data-key="${key}" ${done ? 'disabled' : ''}>+</button>
            </div>
            <button class="done-btn" data-key="${key}" data-count="${item.count}" ${done ? 'disabled' : ''}>تم</button>
          </div>
        </div>`;
    }).join('');

    // تقدم المجموعة
    const completedCount = items.filter(it => {
      const k = cat + '_' + it.id;
      return (athkarCounters[k] || 0) >= it.count;
    }).length;
    const progEl = document.getElementById('group-progress');
    progEl.textContent = groupDone
      ? '✅ أكملت هذه المجموعة اليوم'
      : `أكملت ${completedCount} من ${items.length} أذكار`;

    const completeBtn = document.getElementById('complete-group-btn');
    completeBtn.hidden = groupDone || completedCount < items.length;
  }

  function handleAthkarClick(e) {
    const btn = e.target.closest('[data-action], .done-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    if (!key) return;
    const cat = data.currentAthkarCat;
    const items = ATHKAR[cat] || [];
    const itemId = key.split('_').slice(1).join('_');
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (btn.classList.contains('done-btn')) {
      athkarCounters[key] = item.count;
    } else if (btn.dataset.action === 'plus') {
      athkarCounters[key] = Math.min((athkarCounters[key] || 0) + 1, item.count);
    } else if (btn.dataset.action === 'minus') {
      athkarCounters[key] = Math.max((athkarCounters[key] || 0) - 1, 0);
    }

    if (athkarCounters[key] >= item.count) {
      addPoints(3, 'إكمال ذكر');
      recordActivity();
    }
    renderAthkar();
  }

  function completeAthkarGroup() {
    const cat = data.currentAthkarCat;
    if ((data.completedAthkarToday || []).includes(cat)) return;
    data.completedAthkarToday.push(cat);
    stats.athkarGroupsCompleted++;
    addPoints(15, `إتمام ${GROUP_NAMES[cat] || cat}`);
    recordActivity();
    if (cat === 'morning') {
      if (!data.unlockedAchievements.includes('morning-done')) {
        data.unlockedAchievements.push('morning-done');
      }
    }
    if (cat === 'evening') {
      if (!data.unlockedAchievements.includes('evening-done')) {
        data.unlockedAchievements.push('evening-done');
      }
    }
    saveData();
    showToast(`تقبّل الله... أتممت ${GROUP_NAMES[cat] || cat}`);
    renderAthkar();
    checkAchievements();
  }

  // ========== القرآن ==========
  function renderQuran() {
    const list = document.getElementById('surah-list');
    if (!SURAHS.length) {
      list.innerHTML = '<div class="empty-state">جارِ تحميل قائمة السور...</div>';
      fetchSurahList().then(ok => {
        if (ok) {
          renderQuran();
        } else {
          list.innerHTML = `
            <div class="empty-state">
              <p>تعذّر الاتصال بمصدر القرآن. تأكد من اتصال الإنترنت.</p>
              <button type="button" class="btn-primary" id="retry-quran-list" style="border:none;margin-top:10px;">إعادة المحاولة</button>
            </div>`;
          document.getElementById('retry-quran-list')?.addEventListener('click', renderQuran, { once: true });
        }
      });
      return;
    }
    list.innerHTML = SURAHS.map(s => {
      const status = data.quranSurahProgress[s.number]; // 'started' | 'done' | undefined
      const cls = status === 'done' ? 'surah-done' : (status === 'started' ? 'surah-started' : '');
      return `
      <button class="surah-item ${cls}" data-number="${s.number}">
        <span class="surah-name">${s.number}. سورة ${s.name || '#' + s.number}</span>
        <span class="surah-meta">${s.ayahs} آية</span>
      </button>
    `;
    }).join('');

    const pos = document.getElementById('last-position');
    if (data.lastQuranSurah && data.lastQuranAyah != null) {
      const s = SURAHS.find(x => x.number === data.lastQuranSurah);
      pos.innerHTML = `وصلت إلى: سورة ${s ? s.name : data.lastQuranSurah} — آية ${data.lastQuranAyah + 1}`;
    } else {
      pos.innerHTML = 'آخر موضع: لم تبدأ بعد';
    }

    document.getElementById('goal-progress').textContent =
      `${data.pagesReadToday || 0} / ${data.quranGoal || 1} صفحة`;
  }

  async function openSurah(num) {
    const found = SURAHS.find(s => s.number === Number(num));
    if (!found) return;
    currentSurah = found;
    currentAyahIndex = 0;
    if (data.lastQuranSurah === currentSurah.number && data.lastQuranAyah != null) {
      currentAyahIndex = data.lastQuranAyah;
    }
    if (data.quranSurahProgress[currentSurah.number] !== 'done') {
      data.quranSurahProgress[currentSurah.number] = 'started';
      saveData();
    }
    document.getElementById('surah-list').hidden = true;
    document.getElementById('ayah-viewer').hidden = false;
    document.getElementById('ayah-text').textContent = 'جارِ تحميل السورة...';
    document.getElementById('current-surah-name').textContent = `سورة ${currentSurah.name}`;
    const fsBtn = document.getElementById('open-quran-fullscreen');
    if (fsBtn) fsBtn.disabled = true;

    const audio = document.getElementById('quran-audio');
    if (audio) {
      audio.pause();
      audio.src = quranAudioUrl(currentSurah.number);
    }

    if (!currentSurah.ayahsText) {
      try {
        await fetchSurahText(currentSurah);
      } catch (e) {
        document.getElementById('ayah-text').textContent = 'تعذّر تحميل نص السورة، تأكد من اتصال الإنترنت وحاول تاني.';
        return;
      }
    }
    showAyah();
  }

  // ========== نافذة اختيار "استماع أم قراءة" ==========
  function openSurahChoiceModal(num) {
    const found = SURAHS.find(s => s.number === Number(num));
    if (!found) return;
    quranModalTargetSurah = found.number;
    const modal = document.getElementById('quranChoiceModal');
    if (!modal) { openSurahAndPresent(num, false); return; }
    document.getElementById('quranChoiceSurahName').textContent = `سورة ${found.name}`;
    document.getElementById('quranChoiceSurahMeta').textContent = `${found.ayahs} آية`;
    const select = document.getElementById('quran-reciter-select');
    if (select) select.value = data.quranReciter || DEFAULT_RECITER;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSurahChoiceModal() {
    const modal = document.getElementById('quranChoiceModal');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
    quranModalTargetSurah = null;
  }

  function saveReciterChoice() {
    const select = document.getElementById('quran-reciter-select');
    if (select && select.value) {
      data.quranReciter = select.value;
      saveData();
    }
  }

  // يفتح السورة في وضع القراءة أو الاستماع (autoplay = true للاستماع المباشر)
  async function openSurahAndPresent(num, autoplay) {
    await openSurah(num);
    await openQuranFullscreen();
    if (autoplay) {
      const audio = document.getElementById('quran-audio');
      const btn = document.getElementById('quranFsListenBtn');
      if (audio && audio.src) {
        audio.play().then(() => { if (btn) btn.textContent = '⏸'; }).catch(() => {});
      }
    }
  }

  function chooseReadSurah() {
    saveReciterChoice();
    const num = quranModalTargetSurah;
    closeSurahChoiceModal();
    if (num) openSurahAndPresent(num, false);
  }

  function chooseListenSurah() {
    saveReciterChoice();
    const num = quranModalTargetSurah;
    closeSurahChoiceModal();
    if (num) openSurahAndPresent(num, true);
  }

  // يُستدعى عند اكتمال الاستماع لسورة كاملة صوتيًا
  function markSurahDoneByListening() {
    if (!currentSurah) return;
    const already = data.quranSurahProgress[currentSurah.number] === 'done';
    data.quranSurahProgress[currentSurah.number] = 'done';
    data.lastQuranSurah = currentSurah.number;
    data.lastQuranAyah = currentSurah.ayahsText ? currentSurah.ayahsText.length - 1 : currentAyahIndex;
    data.lastQuranDate = todayStr();
    saveData();
    renderQuran();
    if (!already) {
      addPoints(8, 'الاستماع لسورة كاملة');
      recordActivity();
      if (!data.unlockedAchievements.includes('surah-done')) {
        data.unlockedAchievements.push('surah-done');
        showToast('📖 إنجاز: ختمت سورة');
        saveData();
      }
      checkAchievements();
    }
  }

  // حفظ الموضع ثم الخروج من شاشة القراءة/الاستماع بملء الشاشة
  function saveAndExitQuranFullscreen() {
    if (currentSurah) {
      data.lastQuranSurah = currentSurah.number;
      data.lastQuranAyah = currentAyahIndex;
      data.lastQuranDate = todayStr();
      saveData();
      showToast('تم حفظ موضعك، إلى اللقاء 🌙');
      renderQuran();
    }
    closeQuranFullscreen();
  }

  function showAyah() {
    if (!currentSurah || !currentSurah.ayahsText) return;
    const text = currentSurah.ayahsText[currentAyahIndex] || currentSurah.ayahsText[0];
    document.getElementById('current-surah-name').textContent = `سورة ${currentSurah.name}`;
    document.getElementById('ayah-text').textContent = text;
    document.getElementById('ayah-number').textContent = `آية ${currentAyahIndex + 1} من ${currentSurah.ayahsText.length}`;
    const fsBtn = document.getElementById('open-quran-fullscreen');
    if (fsBtn) fsBtn.disabled = false;
    autoSaveQuranPosition();
  }

  // حفظ تلقائي لمكان التوقف بدون ما المستخدم يحتاج يدوس زرار — بيتنفذ
  // في الخلفية بصمت في كل مرة يتنقل فيها بين الآيات أو السور.
  function autoSaveQuranPosition() {
    if (!currentSurah || !currentSurah.ayahsText) return;
    data.lastQuranSurah = currentSurah.number;
    data.lastQuranAyah = currentAyahIndex;
    data.lastQuranDate = todayStr();
    if (currentAyahIndex >= currentSurah.ayahsText.length - 1) {
      data.quranSurahProgress[currentSurah.number] = 'done';
    }
    saveData();
  }

  // ========== قراءة المصحف بملء الشاشة ==========
  function renderQuranFullscreenBody() {
    if (!currentSurah || !currentSurah.ayahsText) return;
    document.getElementById('quranFsSurahName').textContent = `سورة ${currentSurah.name}`;
    const body = document.getElementById('quranFsBody');
    body.innerHTML = `<div class="quran-fs-page">` +
      currentSurah.ayahsText.map((t, i) =>
        `<span class="quran-fs-ayah">${t}<span class="quran-fs-ayah-num">${i + 1}</span></span>`
      ).join(' ') +
      `</div>`;
    body.scrollTop = 0;
  }

  async function openQuranFullscreen() {
    if (!currentSurah || !currentSurah.ayahsText) {
      showToast('لسه السورة بتتحمل، لحظة واحدة وحاول تاني 🙏');
      return;
    }
    const reader = document.getElementById('quranFullscreenReader');
    reader.hidden = false;
    document.body.style.overflow = 'hidden';
    renderQuranFullscreenBody();
    updateQuranFsNavButtons();
  }

  function closeQuranFullscreen() {
    document.getElementById('quranFullscreenReader').hidden = true;
    document.body.style.overflow = '';
    const audio = document.getElementById('quran-audio');
    if (audio) audio.pause();
    const fsBtn = document.getElementById('quranFsListenBtn');
    if (fsBtn) fsBtn.textContent = '🔊';
  }

  function toggleQuranFullscreenAudio() {
    const audio = document.getElementById('quran-audio');
    const btn = document.getElementById('quranFsListenBtn');
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio.play();
      btn.textContent = '⏸';
    } else {
      audio.pause();
      btn.textContent = '🔊';
    }
  }

  function updateQuranFsNavButtons() {
    const prevBtn = document.getElementById('quranFsPrevBtn');
    const nextBtn = document.getElementById('quranFsNextBtn');
    if (prevBtn) prevBtn.disabled = currentSurah.number <= 1;
    if (nextBtn) nextBtn.disabled = currentSurah.number >= 114;
  }

  async function goToAdjacentSurah(dir) {
    const targetNum = currentSurah.number + dir;
    if (targetNum < 1 || targetNum > 114) return;
    if (dir > 0) {
      // الانتقال للسورة التالية يعتبر إنهاء ضمني للسورة الحالية
      data.quranSurahProgress[currentSurah.number] = 'done';
      saveData();
    }
    const body = document.getElementById('quranFsBody');
    body.innerHTML = '<div class="empty-state">جارِ تحميل السورة...</div>';
    await openSurah(targetNum);
    renderQuranFullscreenBody();
    updateQuranFsNavButtons();
  }

  function saveQuranPosition() {
    if (!currentSurah) return;
    data.lastQuranSurah = currentSurah.number;
    data.lastQuranAyah = currentAyahIndex;
    data.lastQuranDate = todayStr();
    saveData();
    showToast('تم حفظ موضعك');
    renderQuran();
  }

  function markPageRead() {
    data.pagesReadToday = (data.pagesReadToday || 0) + 1;
    data.totalPagesRead = (data.totalPagesRead || 0) + 1;
    stats.quranPagesRead = data.totalPagesRead;
    addPoints(5, 'قراءة صفحة من القرآن');
    recordActivity();
    if (data.pagesReadToday >= (data.quranGoal || 1)) {
      addPoints(10, 'إكمال الهدف اليومي للقرآن');
      showToast('أحسنت! أكملت هدفك اليومي من القرآن');
    }
    // إذا أكمل السورة كاملة
    if (currentSurah && currentSurah.ayahsText && currentAyahIndex >= currentSurah.ayahsText.length - 1) {
      if (!data.unlockedAchievements.includes('surah-done')) {
        data.unlockedAchievements.push('surah-done');
        showToast('📖 إنجاز: ختمت سورة');
      }
    }
    saveData();
    renderQuran();
    checkAchievements();
  }

  // ========== المهام ==========
  function renderTasks() {
    const list = document.getElementById('tasks-list');
    const completed = data.completedTasksToday || [];
    list.innerHTML = DAILY_TASKS.map(t => {
      const done = completed.includes(t.id);
      return `
        <li class="task-item ${done ? 'completed' : ''}" data-id="${t.id}">
          <div class="task-check">${done ? '✓' : ''}</div>
          <div class="task-info">
            <div class="task-title">${t.title}</div>
            <div class="task-points">+${t.points} نقطة</div>
          </div>
        </li>`;
    }).join('');

    const total = DAILY_TASKS.length;
    const doneCount = completed.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    document.getElementById('tasks-progress-bar').style.width = pct + '%';
    document.getElementById('tasks-progress-text').textContent =
      `أكملت ${doneCount} من ${total} مهام اليوم`;
  }

  function toggleTask(id) {
    const completed = data.completedTasksToday || [];
    if (completed.includes(id)) return; // لا إعادة
    const task = DAILY_TASKS.find(t => t.id === id);
    if (!task) return;
    data.completedTasksToday.push(id);
    stats.religiousTasksCompleted++;
    addPoints(task.points, task.title);
    recordActivity();
    saveData();
    showToast(`أحسنت! أتممت: ${task.title}`);
    renderTasks();
    checkAchievements();
  }

  // ========== مواقيت الصلاة ==========
  async function fetchPrayerTimes() {
    const city = data.city || document.getElementById('city-input').value.trim() || 'Cairo';
    const country = data.country || document.getElementById('country-input').value.trim() || 'Egypt';
    const method = data.calculationMethod || 4;
    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.code === 200 && json.data) {
        prayerTimes = json.data.timings;
        data.city = city;
        data.country = country;
        data.calculationMethod = method;
        saveData();
        displayPrayerTimes();
        startCountdown();
      } else {
        showToast('تعذر تحميل المواقيت، تحقق من المدينة');
      }
    } catch (e) {
      console.warn(e);
      showToast('خطأ في الاتصال بمواقيت الصلاة');
    }
  }

  function displayPrayerTimes() {
    if (!prayerTimes) return;
    const names = {
      Fajr: 'الفجر',
      Sunrise: 'الشروق',
      Dhuhr: 'الظهر',
      Asr: 'العصر',
      Maghrib: 'المغرب',
      Isha: 'العشاء'
    };
    const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const container = document.getElementById('prayer-times');
    const now = new Date();
    let nextKey = null;
    let currentKey = null;

    // تحديد الصلاة القادمة
    for (const key of order) {
      if (key === 'Sunrise') continue;
      const [h, m] = prayerTimes[key].split(':').map(Number);
      const t = new Date(now);
      t.setHours(h, m, 0, 0);
      if (t > now) {
        nextKey = key;
        break;
      }
    }
    if (!nextKey) nextKey = 'Fajr'; // غداً

    container.innerHTML = order.map(key => {
      const isNext = key === nextKey;
      const isCurrent = false; // يمكن تحسينه
      return `
        <div class="prayer-row ${isNext ? 'next' : ''} ${isCurrent ? 'current' : ''}">
          <span class="prayer-name">${names[key] || key}</span>
          <span class="prayer-time">${prayerTimes[key]}</span>
        </div>`;
    }).join('');

    document.getElementById('next-prayer-name').textContent = names[nextKey] || nextKey;
  }

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      if (!prayerTimes) return;
      const now = new Date();
      const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      let next = null;
      let nextDate = null;
      for (const key of order) {
        const [h, m] = prayerTimes[key].split(':').map(Number);
        const t = new Date(now);
        t.setHours(h, m, 0, 0);
        if (t > now) {
          next = key;
          nextDate = t;
          break;
        }
      }
      if (!next) {
        // فجر الغد
        const [h, m] = prayerTimes.Fajr.split(':').map(Number);
        nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(h, m, 0, 0);
        next = 'Fajr';
      }
      const diff = nextDate - now;
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      document.getElementById('countdown').textContent =
        String(hrs).padStart(2, '0') + ':' + String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

      // الأذان
      if (diff <= 1000 && diff > -2000 && data.adhanEnabled && !adhanPlayedToday[next]) {
        adhanPlayedToday[next] = true;
        playAdhan(next);
      }
    }, 1000);
  }

  function playAdhan(prayerKey) {
    const names = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    showToast(`حان الآن موعد صلاة ${names[prayerKey] || prayerKey}`);
    if (data.notificationsEnabled && typeof window.showNotification === 'function') {
      window.showNotification(`حان الآن موعد صلاة ${names[prayerKey] || prayerKey}`);
    }
    if (data.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const n = new Notification('طبطبة — حان وقت الصلاة', {
          body: `حان الآن موعد أذان صلاة ${names[prayerKey] || prayerKey}`,
          icon: 'icons/icon-192.png',
          tag: 'adhan-' + prayerKey,
          requireInteraction: true
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch (e) { /* بعض المتصفحات لا تدعم Notification في الخلفية */ }
    }
    const audio = document.getElementById('adhan-audio');
    if (audio && data.adhanEnabled) {
      audio.src = data.adhanReciterUrl || 'https://cdn.aladhan.com/media/audio/adhan/adhan_makkah.mp3';
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    if (data.fullscreenAdhan !== false) {
      showAdhanFullScreen(prayerKey, names[prayerKey] || prayerKey);
    }
  }

  // ========== شاشة الأذان بملء الشاشة ==========
  const ADHAN_LINES = [
    'الله أكبر، الله أكبر',
    'أشهد أن لا إله إلا الله',
    'أشهد أن محمداً رسول الله',
    'حيّ على الصلاة',
    'حيّ على الفلاح',
    'الله أكبر، الله أكبر',
    'لا إله إلا الله'
  ];
  let adhanLineTimers = [];

  function showAdhanFullScreen(prayerKey, prayerName) {
    const el = document.getElementById('adhanFullscreen');
    if (!el) return;
    document.getElementById('adhanFsPrayerName').textContent = 'صلاة ' + prayerName;
    const linesWrap = document.getElementById('adhanFsLines');
    const lines = prayerKey === 'Fajr'
      ? [...ADHAN_LINES.slice(0, 5), 'الصلاة خير من النوم', ...ADHAN_LINES.slice(5)]
      : ADHAN_LINES;
    linesWrap.innerHTML = lines.map(l => `<p class="adhan-fs-line">${l}</p>`).join('');
    el.hidden = false;
    document.body.style.overflow = 'hidden';

    // إظهار كل سطر بالتتابع (تقريبي، غير متزامن حرفياً مع الصوت)
    adhanLineTimers.forEach(t => clearTimeout(t));
    adhanLineTimers = [];
    const lineEls = linesWrap.querySelectorAll('.adhan-fs-line');
    lineEls.forEach((lineEl, i) => {
      adhanLineTimers.push(setTimeout(() => lineEl.classList.add('active'), i * 2600));
    });

    const audio = document.getElementById('adhan-audio');
    if (audio) {
      audio.onended = hideAdhanFullScreen;
    }
    // إغلاق تلقائي احتياطي حتى لو الصوت اتأخر أو فشل
    adhanLineTimers.push(setTimeout(hideAdhanFullScreen, Math.max(lines.length * 2600 + 4000, 30000)));
  }

  function hideAdhanFullScreen() {
    const el = document.getElementById('adhanFullscreen');
    if (el) el.hidden = true;
    document.body.style.overflow = '';
    adhanLineTimers.forEach(t => clearTimeout(t));
    adhanLineTimers = [];
  }

  function renderPrayer() {
    document.getElementById('city-input').value = data.city || '';
    document.getElementById('country-input').value = data.country || '';
    document.getElementById('calc-method').value = data.calculationMethod || 4;
    document.getElementById('adhan-enabled').checked = data.adhanEnabled !== false;
    document.getElementById('notif-enabled').checked = data.notificationsEnabled !== false;
    document.getElementById('adhan-fullscreen-enabled').checked = data.fullscreenAdhan !== false;
    if (data.adhanReciterUrl) document.getElementById('adhan-reciter').value = data.adhanReciterUrl;
    if (data.city) fetchPrayerTimes();
  }

  // ========== التقدم ==========
  function renderProgress() {
    document.getElementById('stat-points').textContent = sectionPoints;
    document.getElementById('stat-streak').textContent = stats.religiousStreak;
    document.getElementById('stat-tasks').textContent = (data.completedTasksToday || []).length;
    document.getElementById('stat-athkar').textContent = (data.completedAthkarToday || []).length;
    document.getElementById('stat-longest').textContent = stats.longestReligiousStreak;
    document.getElementById('stat-achievements').textContent = (data.unlockedAchievements || []).length;

    if (data.lastQuranSurah) {
      const s = SURAHS.find(x => x.number === data.lastQuranSurah);
      document.getElementById('stat-quran').textContent =
        `سورة ${s ? s.name : data.lastQuranSurah} — آية ${(data.lastQuranAyah || 0) + 1}`;
    } else {
      document.getElementById('stat-quran').textContent = '—';
    }
    document.getElementById('stat-next-prayer').textContent =
      document.getElementById('next-prayer-name')?.textContent || '—';
  }

  // ========== الإنجازات ==========
  function renderAchievements() {
    const grid = document.getElementById('achievements-grid');
    grid.innerHTML = ACHIEVEMENTS.map(ach => {
      const unlocked = (data.unlockedAchievements || []).includes(ach.id);
      return `
        <div class="achievement-card ${unlocked ? 'unlocked' : ''}">
          <span class="ach-icon">${ach.icon}</span>
          <div class="ach-title">${ach.title}</div>
          <div class="ach-desc">${ach.desc}</div>
        </div>`;
    }).join('');
  }

  // ========== الأحداث ==========
  function initEvents() {
    // بطاقات الأقسام (بعضها رابط خارجي مثل لعبة "سلّي نفسك" عبر data-href بدل data-section)
    document.querySelectorAll('.section-card').forEach(card => {
      card.addEventListener('click', () => {
        if (card.dataset.href) {
          window.open(card.dataset.href, card.dataset.target || '_self');
          return;
        }
        openSection(card.dataset.section);
      });
    });

    document.getElementById('start-wird-btn')?.addEventListener('click', () => openSection('tasks'));

    // رجوع
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => { window.location.href = HUB_PAGE; });
    });

    // تصنيفات الأذكار
    document.querySelectorAll('.athkar-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        data.currentAthkarCat = btn.dataset.cat;
        saveData();
        renderAthkar();
      });
    });

    document.getElementById('athkar-list')?.addEventListener('click', handleAthkarClick);
    document.getElementById('complete-group-btn')?.addEventListener('click', completeAthkarGroup);

    // القرآن
    document.getElementById('surah-list')?.addEventListener('click', e => {
      const item = e.target.closest('.surah-item');
      if (item) openSurahChoiceModal(item.dataset.number);
    });
    document.getElementById('quranChoiceReadBtn')?.addEventListener('click', chooseReadSurah);
    document.getElementById('quranChoiceListenBtn')?.addEventListener('click', chooseListenSurah);
    document.getElementById('quranChoiceCloseBtn')?.addEventListener('click', closeSurahChoiceModal);
    document.getElementById('quranChoiceModal')?.addEventListener('click', e => {
      if (e.target.id === 'quranChoiceModal') closeSurahChoiceModal();
    });
    document.getElementById('quranFsSaveExitBtn')?.addEventListener('click', saveAndExitQuranFullscreen);
    document.getElementById('prev-ayah')?.addEventListener('click', () => {
      if (currentAyahIndex > 0) {
        currentAyahIndex--;
        showAyah();
      }
    });
    document.getElementById('next-ayah')?.addEventListener('click', () => {
      if (currentSurah && currentSurah.ayahsText && currentAyahIndex < currentSurah.ayahsText.length - 1) {
        currentAyahIndex++;
        showAyah();
      }
    });
    document.getElementById('play-quran-audio')?.addEventListener('click', () => {
      const audio = document.getElementById('quran-audio');
      const btn = document.getElementById('play-quran-audio');
      if (!audio || !audio.src) return;
      if (audio.paused) {
        audio.play();
        btn.innerHTML = '⏸ إيقاف التلاوة';
      } else {
        audio.pause();
        btn.innerHTML = '🔊 تشغيل تلاوة السورة كاملة';
      }
    });
    document.getElementById('quran-audio')?.addEventListener('ended', () => {
      const btn = document.getElementById('play-quran-audio');
      if (btn) btn.innerHTML = '🔊 تشغيل تلاوة السورة كاملة';
      const fsBtn = document.getElementById('quranFsListenBtn');
      if (fsBtn) fsBtn.textContent = '🔊';
      markSurahDoneByListening();
    });
    document.getElementById('open-quran-fullscreen')?.addEventListener('click', openQuranFullscreen);
    document.getElementById('quranFsExitBtn')?.addEventListener('click', closeQuranFullscreen);
    document.getElementById('quranFsListenBtn')?.addEventListener('click', toggleQuranFullscreenAudio);
    document.getElementById('quranFsNextBtn')?.addEventListener('click', () => goToAdjacentSurah(1));
    document.getElementById('quranFsPrevBtn')?.addEventListener('click', () => goToAdjacentSurah(-1));
    document.getElementById('save-position-btn')?.addEventListener('click', saveQuranPosition);
    document.getElementById('mark-page-btn')?.addEventListener('click', markPageRead);
    document.getElementById('continue-reading-btn')?.addEventListener('click', () => {
      if (data.lastQuranSurah) openSurahAndPresent(data.lastQuranSurah, false);
      else showToast('لم تحفظ موضعاً بعد');
    });
    document.getElementById('quran-goal')?.addEventListener('change', e => {
      data.quranGoal = e.target.value;
      saveData();
      renderQuran();
    });

    // المهام
    document.getElementById('tasks-list')?.addEventListener('click', e => {
      const item = e.target.closest('.task-item');
      if (item && !item.classList.contains('completed')) {
        toggleTask(item.dataset.id);
      }
    });

    // الصلاة
    document.getElementById('save-prayer-settings')?.addEventListener('click', () => {
      data.city = document.getElementById('city-input').value.trim();
      data.country = document.getElementById('country-input').value.trim();
      data.calculationMethod = Number(document.getElementById('calc-method').value);
      data.adhanEnabled = document.getElementById('adhan-enabled').checked;
      data.notificationsEnabled = document.getElementById('notif-enabled').checked;
      data.fullscreenAdhan = document.getElementById('adhan-fullscreen-enabled').checked;
      data.adhanReciterUrl = document.getElementById('adhan-reciter').value;
      saveData();
      fetchPrayerTimes();
      if (data.notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      showToast('تم حفظ إعدادات الصلاة');
    });
    document.getElementById('adhanFsClose')?.addEventListener('click', hideAdhanFullScreen);

    // تقليل الحركة
    document.getElementById('reduce-motion-btn')?.addEventListener('click', () => {
      document.body.classList.toggle('reduce-motion');
      const active = document.body.classList.contains('reduce-motion');
      localStorage.setItem('reduceMotion', active ? '1' : '0');
      showToast(active ? 'تم تفعيل تقليل الحركة' : 'تم إلغاء تقليل الحركة');
    });

    // Dark mode من النظام المركزي
    if (localStorage.getItem('darkMode') === '1' || document.body.classList.contains('dark-mode')) {
      document.body.classList.add('dark-mode');
    }
    if (localStorage.getItem('reduceMotion') === '1') {
      document.body.classList.add('reduce-motion');
    }
  }

  // ========== التشغيل ==========
  function init() {
    loadData();
    updateNavPoints();
    initEvents();
    // الصفحات المنفصلة: body[data-panel] يحدد القسم المعروض
    const pagePanel = document.body.dataset.panel;
    if (pagePanel) showPanel(pagePanel);
    // تحميل مواقيت إن وُجدت مدينة محفوظة
    if (data.city) {
      fetchPrayerTimes();
    }
    // لما المتصفح يقيّد المؤقتات وقت إن الصفحة تبقى في الخلفية (تبويب غير نشط)،
    // بمجرد ما المستخدم يرجع للصفحة نتأكد فوراً إننا مفوّتناش وقت أذان
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && prayerTimes) {
        checkMissedAdhan();
      }
    });
  }

  function checkMissedAdhan() {
    if (!prayerTimes || !data.adhanEnabled) return;
    const now = new Date();
    const names = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(key => {
      const [h, m] = prayerTimes[key].split(':').map(Number);
      const t = new Date(now);
      t.setHours(h, m, 0, 0);
      const diffMin = (now - t) / 60000;
      // فاتت الصلاة خلال آخر 10 دقايق ومحصلش تنبيه لسه
      if (diffMin >= 0 && diffMin <= 10 && !adhanPlayedToday[key]) {
        adhanPlayedToday[key] = true;
        playAdhan(key);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
