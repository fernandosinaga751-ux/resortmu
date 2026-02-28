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
  apiKey: "AIzaSyA06ioabPsOgU4OqSX60SOdtctIJnH0iSk",
  authDomain: "gkps-resort-mu.firebaseapp.com",
  projectId: "gkps-resort-mu",
  storageBucket: "gkps-resort-mu.firebasestorage.app",
  messagingSenderId: "267467801408",
  appId: "1:267467801408:web:f50bd5e7c135e4abbcb0a5",
  measurementId: "G-JHDX5PB82D"
};

// ── Deteksi apakah Firebase sudah dikonfigurasi ──
const FB_READY = !FIREBASE_CONFIG.apiKey.includes('GANTI');

let db = null;
let storage = null;

if (FB_READY) {
  try {
    // Cek apakah Firebase sudah di-init sebelumnya
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }
    db = firebase.firestore();
    // Cache offline dinonaktifkan untuk koleksi 'settings'
    // agar password selalu dibaca langsung dari server (tidak dari cache)
    // Init Firebase Storage
    if (typeof firebase.storage !== 'undefined') {
      storage = firebase.storage();
    }
    console.log('✅ Firebase Firestore terhubung');
    if (storage) console.log('✅ Firebase Storage terhubung');
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
   AUTH HELPER — password & session 100% dari Firestore (berlaku semua perangkat)
   ═══════════════════════════════════════════════════════ */

const AUTH = {
  KEY_SESSION: 'gkps_admin_logged',
  DEFAULT_PASS: 'admin123',

  // ── Ambil password dari Firestore (SELALU dari server, bypass cache).
  //    Jika dokumen belum ada → seed DEFAULT_PASS ke Firestore sekarang.
  async getPass() {
    if (!db) return this.DEFAULT_PASS; // Firebase belum dikonfigurasi

    try {
      // { source: 'server' } = paksa ambil dari server, abaikan cache browser
      const snap = await db.collection('settings').doc('admin_config').get({ source: 'server' });

      if (snap.exists && snap.data().password) {
        return snap.data().password;
      }

      // Dokumen belum ada → seed password default ke Firestore
      await db.collection('settings').doc('admin_config').set({ password: this.DEFAULT_PASS }, { merge: true });
      console.log('✅ Password default di-seed ke Firestore.');
      return this.DEFAULT_PASS;

    } catch(e) {
      // Jika source:'server' gagal (offline), coba tanpa source sebagai fallback
      try {
        const snap2 = await db.collection('settings').doc('admin_config').get();
        if (snap2.exists && snap2.data().password) return snap2.data().password;
      } catch(e2) {}
      console.warn('Gagal akses Firestore:', e.message);
      return this.DEFAULT_PASS;
    }
  },

  // ── Login: selalu cek password terbaru dari Firestore ──
  async login(password) {
    const correctPass = await this.getPass();
    if (password === correctPass) {
      sessionStorage.setItem(this.KEY_SESSION, 'true');
      return true;
    }
    return false;
  },

  isLoggedIn() {
    return sessionStorage.getItem(this.KEY_SESSION) === 'true';
  },

  logout() {
    sessionStorage.removeItem(this.KEY_SESSION);
  },

  // ── Ganti password: simpan ke Firestore, berlaku semua perangkat ──
  async changePassword(oldPass, newPass) {
    const correctPass = await this.getPass();
    if (oldPass !== correctPass) return false;
    if (!db) {
      console.warn('Firestore tidak tersedia, password tidak bisa diubah.');
      return false;
    }
    try {
      await db.collection('settings').doc('admin_config').set({ password: newPass }, { merge: true });
      return true;
    } catch(e) {
      console.warn('Gagal simpan password ke Firestore:', e.message);
      return false;
    }
  }
};

/* ═══════════════════════════════════════════════════════
   STORAGE API — Upload/download file via Firebase Storage
   Fallback ke localStorage jika Storage belum dikonfigurasi
   ═══════════════════════════════════════════════════════ */

const STORAGE = {

  isReady() { return !!storage; },

  // ── Upload file ke Firebase Storage, simpan metadata ke Firestore ──
  async uploadFile(seksiId, file, onProgress) {
    if (!storage) {
      // Fallback: base64 ke localStorage (untuk dev/testing)
      return await this._uploadLocalFallback(seksiId, file);
    }

    const path = `files/${seksiId}/${Date.now()}_${file.name}`;
    const ref = storage.ref(path);
    const uploadTask = ref.put(file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        snapshot => {
          const pct = Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100);
          if (onProgress) onProgress(pct);
        },
        err => reject(err),
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          const meta = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: file.name,
            type: file.type,
            size: this._fmtBytes(file.size),
            sizeBytes: file.size,
            date: new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }),
            url: downloadURL,
            path: path,
            _order: Date.now()
          };
          // Simpan metadata ke Firestore
          await DB.addItem('files_seksi_' + seksiId, meta);
          resolve(meta);
        }
      );
    });
  },

  // ── Hapus file dari Storage + metadata dari Firestore ──
  async deleteFile(seksiId, fileId, filePath) {
    if (storage && filePath) {
      try {
        await storage.ref(filePath).delete();
      } catch(e) {
        console.warn('Gagal hapus dari Storage (mungkin sudah dihapus):', e.message);
      }
    }
    await DB.deleteItem('files_seksi_' + seksiId, fileId);
    // Hapus juga dari localStorage fallback
    this._deleteLocalFallback(seksiId, fileId);
  },

  // ── Ambil daftar file (gabungan Firestore + localStorage fallback) ──
  async getFiles(seksiId) {
    let files = [];
    // Dari Firestore/localStorage DB
    try {
      files = await DB.getList('files_seksi_' + seksiId);
    } catch(e) { files = []; }
    // Gabungkan dengan file lama dari localStorage fallback
    const local = this._getLocalFallback(seksiId);
    const allIds = new Set(files.map(f => String(f.id)));
    local.forEach(f => { if (!allIds.has(String(f.id))) files.push(f); });
    files.sort((a,b) => (b._order||0) - (a._order||0));
    return files;
  },

  // ── Fallback: simpan base64 ke localStorage ──
  async _uploadLocalFallback(seksiId, file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const meta = {
          id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: file.name,
          type: file.type,
          size: this._fmtBytes(file.size),
          sizeBytes: file.size,
          date: new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }),
          data: e.target.result, // base64
          _order: Date.now()
        };
        const key = 'gkps_files_seksi_' + seksiId;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        list.unshift(meta);
        try { localStorage.setItem(key, JSON.stringify(list)); }
        catch(err) { reject(new Error('localStorage penuh')); return; }
        resolve(meta);
      };
      reader.onerror = () => reject(new Error('Gagal baca file'));
      reader.readAsDataURL(file);
    });
  },

  _getLocalFallback(seksiId) {
    try { return JSON.parse(localStorage.getItem('gkps_files_seksi_' + seksiId) || '[]'); }
    catch(e) { return []; }
  },

  _deleteLocalFallback(seksiId, fileId) {
    const key = 'gkps_files_seksi_' + seksiId;
    const list = this._getLocalFallback(seksiId).filter(f => String(f.id) !== String(fileId));
    localStorage.setItem(key, JSON.stringify(list));
  },

  _fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
    return (b/1048576).toFixed(1) + ' MB';
  }
};
