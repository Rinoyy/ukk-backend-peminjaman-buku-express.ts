# Backend API (express-qr-backend) — Alur Bisnis

---

## Gambaran Umum

**express-qr-backend** adalah server API pusat yang menjadi tulang punggung seluruh sistem perpustakaan. Server ini mengelola semua data, menerapkan aturan bisnis, dan melayani permintaan dari dua aplikasi frontend: Dashboard Admin dan Portal Siswa.

**Teknologi utama:** Express.js + TypeScript + Prisma ORM + MySQL

---

## Domain Bisnis yang Dikelola

### 1. Manajemen Pengguna (User Management)

**Entitas:** User (Siswa, Admin), StudentNISN

**Proses bisnis:**
- Siswa mendaftar mandiri — **wajib memasukkan NISN** yang terdaftar di sistem sekolah
- Jika NISN tidak ada di tabel `StudentNISN`, pendaftaran ditolak
- Admin login menggunakan kredensial yang disiapkan sebelumnya
- Setiap pengguna mendapat JWT token untuk autentikasi sesi

**Aturan:**
- Password disimpan terenkripsi (bcrypt)
- QR Code dihasilkan dari data unik pengguna (ID/username) menggunakan library `qrcode`
- Token JWT memiliki masa berlaku dan menyimpan `userId` + `role`
- Satu NISN hanya bisa digunakan untuk satu akun

---

### 2. Katalog Buku & Salinan Fisik

**Entitas:** Book, BookCopy, Category

**Proses bisnis:**
- Satu judul buku (`Book`) bisa memiliki banyak salinan fisik (`BookCopy`)
- Setiap `BookCopy` memiliki QR Code unik untuk identifikasi fisik
- Status salinan dikelola secara real-time berdasarkan transaksi peminjaman

**Siklus hidup status BookCopy:**
```
AVAILABLE → RESERVED (saat permintaan masuk)
RESERVED  → BORROWED  (saat admin approve)
RESERVED  → AVAILABLE (saat reject/cancel)
BORROWED  → AVAILABLE (saat pengembalian verified, kondisi GOOD)
BORROWED  → DAMAGED   (saat pengembalian verified, kondisi DAMAGED)
BORROWED  → LOST      (saat pengembalian verified, kondisi LOST)
```

---

### 3. Alur Peminjaman (Borrowing Workflow)

Ini adalah proses bisnis paling kompleks dalam sistem.

#### Fase 1: Pengajuan Peminjaman
```
Siswa ajukan pinjam buku
        ↓
Backend cek eligibilitas siswa:
  1. Tidak punya borrowing aktif (PENDING/BORROWED/RETURN_PENDING)
  2. Tidak punya fine belum dibayar (isPaid: false)
        ↓
Backend cari copy dengan status AVAILABLE
        ↓
Buat record Borrowing (status: PENDING)
Update BookCopy → RESERVED
```

#### Fase 2: Persetujuan Admin
```
Admin approve:
  - Borrowing → BORROWED
  - DueDate = borrowDate + 7 hari
  - PickupDeadline = now + 2 hari
  - Kirim notifikasi BORROW_APPROVED ke siswa

Admin reject:
  - Borrowing → REJECTED
  - BookCopy → AVAILABLE kembali
  - Kirim notifikasi BORROW_REJECTED ke siswa
```

#### Fase 3: Pengajuan Pengembalian
```
Siswa klik "Kembalikan":
  - Borrowing → RETURN_PENDING
  (Admin menunggu siswa datang secara fisik)
```

#### Fase 4: Verifikasi Pengembalian oleh Admin
```
Admin input kondisi fisik buku:

[GOOD + tepat waktu]
  → Borrowing: RETURNED, actualReturnDate = now
  → BookCopy: AVAILABLE
  → Tidak ada denda

[GOOD + terlambat]
  → Hitung lateFee = (hari terlambat) × Rp1.000
  → totalFine = lateFee
  → Borrowing: RETURNED
  → BookCopy: AVAILABLE

[DAMAGED]
  → lateFee (jika terlambat) + damageFee (manual input)
  → totalFine = lateFee + damageFee
  → Borrowing: RETURNED
  → BookCopy: DAMAGED

[LOST]
  → lateFee + replacementFee
  → totalFine = total biaya penggantian
  → Borrowing: RETURNED
  → BookCopy: LOST
```

#### Fase 5: Pembayaran Denda
```
Siswa bayar denda tunai ke admin
        ↓
Admin input jumlah bayar
        ↓
Sistem hitung kembalian = bayar - totalFine
        ↓
Buat record Payment
Borrowing.isPaid = true
```

---

### 4. Sistem Denda (Fine System)

**Kalkulasi denda:**

| Kondisi | Denda |
|---|---|
| Terlambat | Rp 1.000 × jumlah hari terlambat |
| Rusak | lateFee + damageFee (ditentukan admin) |
| Hilang | lateFee + biaya penggantian buku |

**Dampak denda:**
- Siswa dengan denda belum dibayar **tidak bisa mengajukan peminjaman baru**
- Denda harus dilunasi secara fisik ke perpustakaan
- Admin yang memproses pembayaran dan mencatatnya ke sistem

---

### 5. Sistem Kunjungan via QR (Visit)

**Tujuan:** Merekam kehadiran siswa di perpustakaan.

**Proses:**
```
Siswa scan QR Code di pintu masuk
        ↓
POST /api/visits/check-in dengan data QR
        ↓
Sistem decode QR → identifikasi userId
        ↓
Buat record Visit { userId, visitedAt: now }
        ↓
Return konfirmasi check-in berhasil
```

---

### 6. Sistem Notifikasi

**Jenis notifikasi yang dikirim sistem:**

| Type | Kapan | Konten |
|---|---|---|
| `BORROW_APPROVED` | Admin approve peminjaman | "Peminjaman kamu disetujui. Ambil buku dalam 2 hari." |
| `BORROW_REJECTED` | Admin reject peminjaman | "Peminjaman kamu ditolak." + alasan |
| `PICKUP_REMINDER` | Mendekati batas pengambilan | "Segera ambil buku sebelum [tanggal]" |
| `GENERAL` | Manual dari Admin | Pesan bebas dari perpustakaan |

---

### 7. Automasi: Cron Job

**Tugas:** Membatalkan peminjaman yang tidak diambil.

**Jadwal:** Berjalan setiap **1 jam**

**Logika:**
```
Cari semua Borrowing dengan:
  - status: PENDING
  - borrowDate lebih dari 24 jam yang lalu

Untuk setiap record:
  - Update status → CANCELLED
  - Update BookCopy → AVAILABLE
```

**Tujuan bisnis:** Mencegah salinan buku "terkunci" oleh permintaan yang tidak pernah diambil, sehingga ketersediaan buku selalu akurat.

---

## Aturan Bisnis Kritis

| Aturan | Detail |
|---|---|
| Registrasi wajib NISN | Hanya siswa dengan NISN terdaftar yang bisa mendaftar |
| Satu peminjaman aktif per siswa | Siswa tidak bisa pinjam 2 buku bersamaan |
| Blokir saat ada denda | Denda belum dibayar → tidak bisa pinjam baru |
| Batas waktu pinjam | 7 hari dari tanggal persetujuan |
| Batas ambil buku | 2 hari dari tanggal persetujuan |
| Auto-cancel | Pending > 24 jam → otomatis dibatalkan |
| Denda keterlambatan | Rp 1.000/hari setelah due date |

---

## Pemisahan Akses Berdasarkan Role

| Endpoint | SISWA | ADMIN |
|---|---|---|
| Register (butuh NISN) | ✓ | - |
| Login | ✓ | ✓ |
| Lihat buku | ✓ | ✓ |
| Ajukan pinjam | ✓ | - |
| Approve/Reject pinjam | - | ✓ |
| Verifikasi pengembalian | - | ✓ |
| Proses pembayaran | - | ✓ |
| CRUD buku & kategori | - | ✓ |
| Kelola NISN siswa | - | ✓ |
| Lihat data kunjungan | - | ✓ |
