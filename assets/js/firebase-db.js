/* ═══════════════════════════════════════════════════════════════
   GKPS RESORT MEDAN UTARA - FIREBASE DATABASE
   
   CARA SETUP:
   1. Buka https://console.firebase.google.com
   2. Buat project baru → nama: gkps-resort-medan-utara
   3. Build → Firestore Database → Create → Test mode → Enable
   4. Project Settings → Add App → Web → Copy config
   5. Ganti nilai FIREBASE_CONFIG di bawah ini
   6. Di Vercel: Settings → Environment Variables (opsional)
   ═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            window.ENV_FIREBASE_API_KEY            || "GANTI_API_KEY",
  authDomain:        window.ENV_FIREBASE_AUTH_DOMAIN        || "GANTI.firebaseapp.com",
  projectId:         window.ENV_FIREBASE_PROJECT_ID         || "GANTI_PROJECT_ID",
  storageBucket:     window.ENV_FIREBASE_STORAGE_BUCKET     || "GANTI.appspot.com",
  messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID|| "GANTI_SENDER_ID",
  appId:             window.ENV_FIREBASE_APP_ID             || "GANTI_APP_ID",
};

// ── Deteksi apakah Firebase sudah dikonfigurasi ──
const FB_READY = !FIREBASE_CONFIG.apiKey.includes('GANTI');

let db = null;

if (FB_READY) {
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    console.log('✅ Firebase Firestore terhubung');
  } catch(e) {
    console.warn('⚠️ Firebase gagal init, pakai localStorage:', e.message);
  }
}

/* ═══════════════════════════════════════════════════════
   DB API — semua fungsi otomatis pilih Firestore atau localStorage
   ═══════════════════════════════════════════════════════ */

const DB = {

  // ── Simpan array ke koleksi Firestore atau localStorage ──
  async setList(key, data) {
    if (db) {
      const batch = db.batch();
      // Hapus semua dokumen lama
      const snap = await db.collection(key).get();
      snap.forEach(doc => batch.delete(doc.ref));
      // Simpan data baru
      data.forEach((item, i) => {
        const ref = db.collection(key).doc(item.id ? String(item.id) : String(i));
        batch.set(ref, item);
      });
      await batch.commit();
    } else {
      localStorage.setItem('gkps_' + key, JSON.stringify(data));
    }
  },

  // ── Ambil array dari koleksi ──
  async getList(key) {
    if (db) {
      try {
        const snap = await db.collection(key).orderBy('_order', 'asc').get().catch(() =>
          db.collection(key).get()
        );
        return snap.docs.map(d => d.data());
      } catch(e) {
        console.warn('Firestore read error:', e);
        return [];
      }
    } else {
      return JSON.parse(localStorage.getItem('gkps_' + key) || '[]');
    }
  },

  // ── Tambah satu item ke koleksi ──
  async addItem(key, item) {
    const id = String(item.id || Date.now());
    item.id = id;
    item._order = Date.now();
    if (db) {
      await db.collection(key).doc(id).set(item);
    } else {
      const list = JSON.parse(localStorage.getItem('gkps_' + key) || '[]');
      list.unshift(item);
      localStorage.setItem('gkps_' + key, JSON.stringify(list));
    }
    return item;
  },

  // ── Hapus satu item dari koleksi ──
  async deleteItem(key, id) {
    if (db) {
      await db.collection(key).doc(String(id)).delete();
    } else {
      const list = JSON.parse(localStorage.getItem('gkps_' + key) || '[]');
      const filtered = list.filter(i => String(i.id) !== String(id));
      localStorage.setItem('gkps_' + key, JSON.stringify(filtered));
    }
  },

  // ── Simpan objek tunggal (settings) ──
  async setDoc(key, data) {
    if (db) {
      await db.collection('settings').doc(key).set(data);
    } else {
      localStorage.setItem('gkps_' + key, JSON.stringify(data));
    }
  },

  // ── Ambil objek tunggal ──
  async getDoc(key) {
    if (db) {
      try {
        const snap = await db.collection('settings').doc(key).get();
        return snap.exists ? snap.data() : {};
      } catch(e) { return {}; }
    } else {
      return JSON.parse(localStorage.getItem('gkps_' + key) || '{}');
    }
  },

  // ── Realtime listener untuk koleksi ──
  onList(key, callback) {
    if (db) {
      return db.collection(key).onSnapshot(snap => {
        const data = snap.docs.map(d => d.data());
        data.sort((a,b) => (b._order||0) - (a._order||0));
        callback(data);
      });
    } else {
      // Fallback: sekali baca saja
      callback(JSON.parse(localStorage.getItem('gkps_' + key) || '[]'));
      return () => {};
    }
  },

  isOnline() { return !!db; }
};

/* ═══════════════════════════════════════════════════════
   AUTH HELPER — persist login dengan sessionStorage + localStorage
   ═══════════════════════════════════════════════════════ */

const AUTH = {
  KEY_PASS: 'gkps_admin_pass',
  KEY_SESSION: 'gkps_admin_logged',
  DEFAULT_PASS: 'admin123',

  getPass() {
    return localStorage.getItem(this.KEY_PASS) || this.DEFAULT_PASS;
  },

  // Login: simpan session di KEDUA storage agar persist saat refresh
  login(password) {
    if (password === this.getPass()) {
      localStorage.setItem(this.KEY_SESSION, 'true');   // bertahan selamanya
      sessionStorage.setItem(this.KEY_SESSION, 'true'); // backup
      return true;
    }
    return false;
  },

  // Cek apakah sudah login (cek keduanya)
  isLoggedIn() {
    return localStorage.getItem(this.KEY_SESSION) === 'true' ||
           sessionStorage.getItem(this.KEY_SESSION) === 'true';
  },

  logout() {
    localStorage.removeItem(this.KEY_SESSION);
    sessionStorage.removeItem(this.KEY_SESSION);
  },

  changePassword(oldPass, newPass) {
    if (oldPass !== this.getPass()) return false;
    localStorage.setItem(this.KEY_PASS, newPass);
    return true;
  }
};
