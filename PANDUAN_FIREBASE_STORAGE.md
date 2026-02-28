# 🔥 Panduan Setup Firebase Storage
## GKPS Resort Medan Utara — Upload File Online

Dengan Firebase Storage, file PDF/Word yang diupload admin tersimpan di **cloud Google** 
dan bisa diakses dari perangkat mana pun secara online.

---

## Langkah 1 — Aktifkan Firebase Storage di Console

1. Buka https://console.firebase.google.com
2. Pilih project Anda (misal: `gkps-resort-medan-utara`)
3. Di menu kiri, klik **Build → Storage**
4. Klik **Get started**
5. Pilih **Start in production mode** → klik **Next**
6. Pilih region terdekat: **asia-southeast2 (Jakarta)** → klik **Done**

---

## Langkah 2 — Atur Rules (Izin Upload & Baca)

Setelah Storage aktif, Anda perlu mengatur siapa yang boleh upload dan baca file.

1. Di halaman Storage, klik tab **Rules**
2. Hapus semua isi yang ada, ganti dengan rules berikut:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // File unduhan: siapa pun boleh baca, hanya dari web (tanpa auth) boleh tulis
    match /files/{allPaths=**} {
      allow read: if true;
      allow write: if true;  // Ganti ini setelah production siap
    }
  }
}
```

3. Klik **Publish**

> ⚠️ **Catatan keamanan:** Rules `allow write: if true` membolehkan siapa pun upload.
> Ini aman untuk penggunaan internal, tapi jika ingin lebih ketat, tambahkan 
> Firebase Authentication dan ubah rules ke `allow write: if request.auth != null;`

---

## Langkah 3 — Salin Storage Bucket ke Konfigurasi

1. Di Firebase Console, klik ikon ⚙️ **Project Settings**
2. Scroll ke bagian **Your apps** → pilih web app Anda
3. Salin nilai `storageBucket` (contoh: `gkps-resort-medan-utara.appspot.com`)
4. Buka file `assets/js/firebase-db.js`
5. Ganti nilai `GANTI.appspot.com` dengan nilai storageBucket Anda:

```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",          // sudah diisi
  authDomain:        "gkps-resort....firebaseapp.com",
  projectId:         "gkps-resort-medan-utara",
  storageBucket:     "gkps-resort-medan-utara.appspot.com",  // ← isi ini
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

---

## Langkah 4 — Test Upload

1. Deploy website ke Vercel/hosting Anda
2. Buka Panel Admin → **File Unduhan**
3. Pilih salah satu seksi
4. Akan muncul status: **☁️ Firebase Storage aktif**
5. Upload file PDF — progress bar akan muncul saat upload
6. Setelah selesai, file muncul dengan label **☁️ Cloud**
7. File bisa diakses dari halaman seksi di browser mana pun

---

## Troubleshooting

| Error | Penyebab | Solusi |
|-------|----------|--------|
| `storage/unauthorized` | Rules belum diatur | Ikuti Langkah 2 |
| `storage/object-not-found` | File sudah dihapus | Upload ulang |
| Upload jalan tapi file tidak muncul | storageBucket salah | Cek Langkah 3 |
| Status masih "Lokal" | Firebase Storage SDK gagal load | Cek koneksi internet |

---

## Kapasitas & Biaya

Firebase Storage paket **Spark (gratis)** mencakup:
- **5 GB** penyimpanan file
- **1 GB/hari** bandwidth download
- Cukup untuk ratusan file PDF/dokumen

Untuk kebutuhan lebih besar, upgrade ke paket Blaze (bayar sesuai pemakaian).

---

*Dibuat untuk GKPS Resort Medan Utara · Soli Deo Gloria*
