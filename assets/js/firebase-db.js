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
  apiKey:            window.ENV_FIREBASE_API_KEY            || "AIzaSyA06ioabPsOgU4OqSX60SOdtctIJnH0iSk",
  authDomain:        window.ENV_FIREBASE_AUTH_DOMAIN        || "gkps-resort-mu.firebaseapp.com",
  projectId:         window.ENV_FIREBASE_PROJECT_ID         || "gkps-resort-mu",
  storageBucket:     window.ENV_FIREBASE_STORAGE_BUCKET     || "gkps-resort-mu.firebasestorage.app",
  messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID|| "267467801408",
  appId:             window.ENV_FIREBASE_APP_ID             || "1:267467801408:web:f50bd5e7c135e4abbcb0a5",
};

// ── Deteksi apakah Firebase sudah dikonfigurasi ──
const FB_READY = !FIREBASE_CONFIG.apiKey.includes('GANTI');

let db = null;

if (FB_READY) {
  try {
    // Cek apakah Firebase sudah di-init sebelumnya
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    // Aktifkan cache offline agar data tetap muncul walau koneksi lambat
    db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
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
        // Coba dengan sort, kalau gagal tanpa sort
        let snap;
        try {
          snap = await db.collection(key).orderBy('_order', 'desc').get();
        } catch(e) {
          snap = await db.collection(key).get();
        }
        const data = snap.docs.map(d => d.data());
        // Sort secara lokal berdasarkan _order descending (terbaru dulu)
        data.sort((a, b) => (b._order || 0) - (a._order || 0));
        return data;
      } catch(e) {
        console.warn('Firestore read error:', e.message);
        return [];
      }
    } else {
      return JSON.parse(localStorage.getItem('gkps_' + key) || '[]');
    }
  },

  // ── Compress foto base64 agar tidak melebihi limit Firestore (1MB/doc) ──
  compressFoto(base64, maxWidth = 800) {
    return new Promise(resolve => {
      if (!base64 || !base64.startsWith('data:image')) { resolve(base64); return; }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  },

  // ── Tambah satu item ke koleksi ──
  async addItem(key, item) {
    const id = String(item.id || Date.now());
    item.id = id;
    item._order = Date.now();
    // Compress foto sebelum simpan ke Firestore
    if (item.foto && item.foto.startsWith('data:image')) {
      item.foto = await this.compressFoto(item.foto);
    }
    if (db) {
      try {
        await db.collection(key).doc(id).set(item);
      } catch(e) {
        // Kalau masih error (misal foto terlalu besar), simpan tanpa foto
        console.warn('Firestore save error, retry tanpa foto:', e.message);
        const itemNoFoto = {...item, foto: null};
        await db.collection(key).doc(id).set(itemNoFoto);
      }
    } else {
      const list = JSON.parse(localStorage.getItem('gkps_' + key) || '[]');
      list.unshift(item);
      try { localStorage.setItem('gkps_' + key, JSON.stringify(list)); }
      catch(e) { console.warn('localStorage full'); }
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
      try {
        await db.collection('settings').doc(key).set(data);
      } catch(e) {
        console.error('setDoc error:', e.message);
        throw e;
      }
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

  isOnline() { return !!db; },

  // ── Simpan atomic counter (increment) untuk Firestore ──
  async incrementCounter(key) {
    if (db) {
      const ref = db.collection('settings').doc(key);
      await db.runTransaction(async t => {
        const snap = await t.get(ref);
        const current = snap.exists ? (snap.data().value || 0) : 0;
        t.set(ref, { value: current + 1, updatedAt: Date.now() });
      });
    } else {
      const n = parseInt(localStorage.getItem('gkps_' + key) || '0') + 1;
      localStorage.setItem('gkps_' + key, String(n));
    }
  },

  async getCounter(key) {
    if (db) {
      try {
        const snap = await db.collection('settings').doc(key).get();
        return snap.exists ? (snap.data().value || 0) : 0;
      } catch(e) { return 0; }
    } else {
      return parseInt(localStorage.getItem('gkps_' + key) || '0');
    }
  }
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
