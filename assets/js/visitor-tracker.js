/* ═══════════════════════════════════════════════════════════════
   GKPS RESORT MEDAN UTARA - VISITOR TRACKER
   Mencatat siapa & berapa orang yang mengunjungi website
   ═══════════════════════════════════════════════════════════════ */

const VISITOR = {
  // Nama halaman yang mudah dibaca
  PAGE_NAMES: {
    '/index.html': 'Halaman Utama',
    '/': 'Halaman Utama',
    '/seksi/inang.html': 'Seksi Inang',
    '/seksi/bapa.html': 'Seksi Bapa',
    '/seksi/namaposo.html': 'Seksi Namaposo',
    '/seksi/sekolah-minggu.html': 'Sekolah Minggu',
    '/jemaat/kampung-durian.html': 'Jemaat Kampung Durian',
    '/jemaat/martubung.html': 'Jemaat Martubung',
    '/jemaat/krakatau.html': 'Jemaat Krakatau',
    '/jemaat/batang-sere.html': 'Jemaat Batang Sere',
    '/jemaat/belawan.html': 'Jemaat Belawan',
    '/kegiatan-detail.html': 'Detail Kegiatan',
    '/admin/index.html': 'Panel Admin',
  },

  // Dapatkan nama halaman saat ini
  getPageName() {
    const path = window.location.pathname;
    // Coba cocokkan path
    for (const [key, val] of Object.entries(this.PAGE_NAMES)) {
      if (path.endsWith(key) || path === key) return val;
    }
    return document.title || path;
  },

  // Dapatkan atau buat visitor ID unik
  getVisitorId() {
    let id = localStorage.getItem('gkps_visitor_id');
    if (!id) {
      id = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('gkps_visitor_id', id);
    }
    return id;
  },

  // Dapatkan info browser & perangkat
  getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Desktop';
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = 'Mobile';
    else if (/Tablet/i.test(ua)) device = 'Tablet';

    let browser = 'Lainnya';
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Edge/i.test(ua)) browser = 'Edge';

    return { device, browser };
  },

  // Cek apakah sesi ini sudah dicatat (hindari double count per sesi)
  isSessionTracked(page) {
    const key = 'gkps_tracked_' + btoa(page).substr(0, 10);
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
    return false;
  },

  // Main: catat kunjungan
  async track() {
    // Jangan catat panel admin sebagai pengunjung biasa
    if (window.location.pathname.includes('/admin/')) return;

    const page = this.getPageName();
    const pagePath = window.location.pathname;

    // Hindari double count dalam satu sesi browser tab
    if (this.isSessionTracked(pagePath)) return;

    const visitorId = this.getVisitorId();
    const { device, browser } = this.getDeviceInfo();
    const now = Date.now();
    const dateStr = new Date().toLocaleDateString('id-ID', { year:'numeric', month:'2-digit', day:'2-digit' });
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

    const visitData = {
      id: now + '_' + Math.random().toString(36).substr(2, 5),
      visitorId,
      page,
      pagePath,
      device,
      browser,
      date: dateStr,
      time: timeStr,
      timestamp: now,
      _order: now
    };

    try {
      // Simpan log kunjungan
      await DB.addItem('visitor_log', visitData);

      // Increment total counter
      await DB.incrementCounter('total_visitors');

      // Increment counter hari ini
      const todayKey = 'visitors_' + dateStr.replace(/\//g, '-');
      await DB.incrementCounter(todayKey);

      console.log('✅ Kunjungan dicatat:', page);
    } catch(e) {
      console.warn('⚠️ Gagal catat kunjungan:', e.message);
    }
  }
};

// Jalankan tracking setelah halaman siap
document.addEventListener('DOMContentLoaded', () => {
  // Tunggu DB siap (firebase-db.js harus dimuat duluan)
  setTimeout(() => VISITOR.track(), 500);
});
