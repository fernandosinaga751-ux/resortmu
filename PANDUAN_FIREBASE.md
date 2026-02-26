# PANDUAN SETUP FIREBASE — resortmu.vercel.app

## ✅ Yang Sudah Diperbaiki
1. **Refresh tidak kembali ke login** — session tersimpan di localStorage
2. **Database online Firebase** — semua data tersinkron ke Firestore
3. Semua halaman (jemaat + seksi) sudah terhubung ke Firebase

---

## LANGKAH 1 — Buat Firebase Project

1. Buka https://console.firebase.google.com
2. Klik **"Add project"** → nama: `gkps-resort-medan-utara`
3. Klik Continue (Google Analytics bisa dimatikan)
4. Tunggu sampai project selesai dibuat

---

## LANGKAH 2 — Aktifkan Firestore

1. Di menu kiri → **Build → Firestore Database**
2. Klik **"Create database"**
3. Pilih **"Start in test mode"** → Next
4. Pilih region: **asia-southeast1 (Singapore)** → Enable

---

## LANGKAH 3 — Ambil Konfigurasi Firebase

1. Klik ikon ⚙️ **Project Settings** (kiri atas)
2. Scroll ke bawah → bagian **"Your apps"**
3. Klik ikon **Web** (`</>`)
4. Beri nama app: `resortmu-web` → **Register app**
5. Copy nilai dari `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "AIza...",           ← salin ini
  authDomain: "xxx.firebaseapp.com",
  projectId: "gkps-resort...",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123456",
  appId: "1:123:web:abc"
};
```

---

## LANGKAH 4 — Masukkan Config ke File

Buka file: `assets/js/firebase-db.js`

Ganti bagian ini:
```js
const FIREBASE_CONFIG = {
  apiKey:            "GANTI_API_KEY",
  authDomain:        "GANTI.firebaseapp.com",
  projectId:         "GANTI_PROJECT_ID",
  storageBucket:     "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId:             "GANTI_APP_ID",
};
```

Dengan nilai dari firebaseConfig tadi.

---

## LANGKAH 5 — Upload ke GitHub & Deploy Vercel

1. Upload semua file ke GitHub repository
2. Vercel akan otomatis redeploy
3. Buka https://resortmu.vercel.app/admin
4. Login dengan password: **admin123**
5. Di header admin akan muncul: 🟢 **Tersinkron ke Firebase**

---

## INFO AKUN ADMIN

- **URL**: https://resortmu.vercel.app/admin
- **Password default**: `admin123`
- Ganti password di menu **Pengaturan Akun** setelah login

---

## CATATAN

- Jika Firebase belum dikonfigurasi, website tetap berjalan pakai localStorage (data hanya tersimpan di browser lokal)
- Setelah Firebase aktif, data tersimpan online dan bisa dilihat semua orang
- Data foto tersimpan sebagai base64 di Firestore (maks ~1MB per foto)
