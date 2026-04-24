# Backend API (express-qr-backend) — Alur Bisnis

---

## Gambaran Umum

**express-qr-backend** adalah server API pusat yang menjadi tulang punggung seluruh sistem perpustakaan. Server ini mengelola semua data, menerapkan aturan bisnis, dan melayani permintaan dari dua aplikasi frontend: Dashboard Admin dan Portal Siswa.

**Teknologi utama:** Node.js + Express.js + TypeScript + Prisma ORM + MySQL

---

## Status & Enum Penting

### Status Peminjaman (BorrowStatus)

```
PENDING ──── approve ──► BORROWED ──── return request ──► RETURN_PENDING ──── verify ──► RETURNED
   │                                                                │
   ├── reject ──► REJECTED                                         └── reject return ──► BORROWED
   └── cancel / 24h auto ──► CANCELLED
```

| Status | Keterangan |
|---|---|
| `PENDING` | Permintaan masuk, copy di-RESERVED, menunggu persetujuan |
| `BORROWED` | Disetujui, dueDate +7 hari, copy BORROWED |
| `RETURN_PENDING` | Siswa ajukan pengembalian (butuh isPickedUp = true) |
| `RETURNED` | Admin verifikasi kondisi, denda dihitung |
| `REJECTED` | Ditolak admin, copy kembali AVAILABLE |
| `CANCELLED` | Dibatalkan siswa atau auto-cancel setelah 24 jam |

### Status BookCopy (CopyStatus)

```
AVAILABLE ──► RESERVED ──── approve ──► BORROWED ──── kondisi GOOD ──► AVAILABLE
                 │                          │
                 └── reject/cancel ──►      ├── kondisi DAMAGED ──► DAMAGED
                       AVAILABLE             └── kondisi LOST ──► LOST
```

---

## Domain Bisnis yang Dikelola

### 1. Manajemen Pengguna (User Management)

**Entitas:** User, StudentNISN

**Proses bisnis:**
- Siswa mendaftar mandiri — **wajib NISN** yang terdaftar di tabel `StudentNISN`
- Jika NISN tidak ada, pendaftaran ditolak (HTTP 403)
- Admin login menggunakan `username + password`
- Petugas dibuat oleh Admin — tidak bisa mendaftar mandiri
- Setiap pengguna mendapat JWT token untuk autentikasi sesi

**Aturan:**
- Password disimpan terenkripsi (bcrypt, 10 salt rounds)
- QR Code dihasilkan dari `userId` menggunakan library `qrcode`, disimpan sebagai base64
- Token JWT berisi `{ userId, role }`, berlaku 1 jam
- Satu NISN hanya bisa untuk satu akun
- Role: `ADMIN`, `PETUGAS`, `SISWA`

---

### 2. Katalog Buku & Salinan Fisik

**Entitas:** Book, BookCopy, Category

**Proses bisnis:**
- Satu judul buku (`Book`) bisa memiliki banyak salinan fisik (`BookCopy`)
- Setiap `BookCopy` punya `copyNumber` urut dan QR Code unik
- `Book.stock` = jumlah copy dengan status `AVAILABLE` (dihitung dinamis)
- Status copy dikelola otomatis oleh alur peminjaman

**Saat membuat buku baru:**
```
Admin input: title, author, categoryId, stock (misal: 3), image
     ↓
Sistem buat 1 record Book
     ↓
Sistem buat 3 record BookCopy (copyNumber: 1, 2, 3)
     ↓
Tiap BookCopy di-generate QR Code uniknya
```

---

### 3. Alur Peminjaman (Borrowing Workflow)

Ini adalah proses bisnis paling kompleks dalam sistem.

#### Fase 1: Pengajuan Peminjaman (Siswa)
```
Siswa kirim: POST /api/borrow { bookId }
     ↓
Backend cek eligibilitas siswa:
  ✓ Tidak ada borrowing aktif (PENDING/BORROWED/RETURN_PENDING)
  ✓ Tidak ada fine belum dibayar (totalFine > 0, isPaid = false)
     ↓
Backend cari BookCopy dengan status AVAILABLE (copyNumber terkecil)
     ↓
Jika tidak ada → 400 "Tidak ada salinan tersedia"
     ↓
Prisma $transaction:
  1. Buat Borrowing { userId, bookCopyId, status: 'PENDING' }
  2. Update BookCopy { status: 'RESERVED' }
     ↓
Return 201 Created
```

**Mengapa pakai transaction?** Mencegah race condition: dua siswa tidak bisa mendapatkan copy yang sama secara bersamaan.

#### Fase 2: Persetujuan Admin/Petugas
```
POST /api/borrow/:id/approve  { status: 'BORROWED' }
     ↓
Prisma $transaction:
  1. Borrowing → status: BORROWED, borrowDate: now, dueDate: now + 7 hari
  2. BookCopy → status: BORROWED
  3. Notification → type: BORROW_APPROVED, pesan ke siswa

POST /api/borrow/:id/approve  { status: 'REJECTED', rejectReason }
     ↓
Prisma $transaction:
  1. Borrowing → status: REJECTED, rejectReason
  2. BookCopy → status: AVAILABLE   ← copy dikembalikan
  3. Notification → type: BORROW_REJECTED, pesan ke siswa
```

#### Fase 3: Pengambilan Buku
```
POST /api/borrow/:id/pickup
     ↓
Borrowing.isPickedUp = true
     ↓
Siswa baru bisa mengajukan pengembalian setelah ini
```

#### Fase 4: Pengajuan Pengembalian (Siswa)
```
POST /api/borrow/:id/return
     ↓
Syarat: status = BORROWED dan isPickedUp = true
     ↓
Borrowing → status: RETURN_PENDING
```

#### Fase 5: Verifikasi Pengembalian (Admin/Petugas)
```
POST /api/borrow/:id/verify-return  { condition, damageFee }
     ↓
Hitung denda:
  daysLate = ceil((actualReturnDate - dueDate) / 86_400_000)
  lateFee  = max(0, daysLate) × 1000
  totalFine = lateFee + damageFee

[GOOD + tepat waktu]   → totalFine = 0,         copy: AVAILABLE
[GOOD + terlambat]     → totalFine = lateFee,    copy: AVAILABLE
[DAMAGED]              → totalFine = lateFee + damageFee, copy: DAMAGED
[LOST]                 → totalFine = lateFee + damageFee, copy: LOST

isPaid = (totalFine === 0)  ← otomatis true jika tidak ada denda
```

#### Fase 6: Pembayaran Denda
```
POST /api/borrow/:id/pay  { amountPaid }
     ↓
Syarat: amountPaid >= totalFine
     ↓
Hitung kembalian = amountPaid - totalFine
     ↓
Prisma $transaction:
  1. Buat Payment { borrowingId, amount, amountPaid, change, paidById }
  2. Borrowing.isPaid = true
```

---

### 4. Sistem Denda (Fine System)

**Kalkulasi:**

| Kondisi | Formula |
|---|---|
| Terlambat | `ceil(hari terlambat) × Rp 1.000` |
| Rusak | `lateFee + damageFee (input admin)` |
| Hilang | `lateFee + biaya penggantian (input admin)` |

**Dampak denda:**
- Siswa dengan `totalFine > 0 && isPaid = false` **tidak bisa mengajukan peminjaman baru**
- Denda dilunasi secara tunai ke admin, admin mencatat di sistem
- Setelah lunas: siswa bisa meminjam lagi

---

### 5. Sistem Kunjungan via QR (Visit)

```
Siswa tampilkan QR Code dari halaman Profile
     ↓
Petugas scan QR siswa
     ↓
POST /api/visits/checkin { userId }
     ↓
Sistem decode userId dari QR
Buat record Visit { userId, visitDate: now }
     ↓
(saat keluar)
POST /api/visits/checkout { userId }
     ↓
Update Visit.checkoutDate = now
```

---

### 6. Sistem Notifikasi

| Type | Kapan | Pesan |
|---|---|---|
| `BORROW_APPROVED` | Admin approve | "Peminjaman disetujui. Ambil buku dalam 2 hari." |
| `BORROW_REJECTED` | Admin reject | "Peminjaman ditolak: [alasan]" |
| `PICKUP_REMINDER` | Mendekati deadline | "Segera ambil buku sebelum [tanggal]" |
| `GENERAL` | Manual Admin | Pesan bebas |

---

### 7. Automasi: Cron Job

**Jadwal:** Setiap 1 jam (`0 * * * *`)

```
Cari semua Borrowing:
  - status = 'PENDING'
  - createdAt < (now - 24 jam)

Untuk tiap yang ditemukan:
  1. Borrowing → status: CANCELLED
  2. BookCopy → status: AVAILABLE
```

**Tujuan:** Mencegah copy buku "terkunci" oleh permintaan yang tidak pernah diproses.

---

## Aturan Bisnis Kritis

| Aturan | Detail |
|---|---|
| Registrasi wajib NISN | Hanya siswa dengan NISN terdaftar yang bisa daftar |
| Satu peminjaman aktif | Siswa tidak bisa pinjam 2 buku bersamaan |
| Blokir saat ada denda | Denda belum lunas → tidak bisa pinjam baru |
| Batas waktu pinjam | 7 hari dari tanggal persetujuan |
| Batas ambil buku | 2 hari dari tanggal persetujuan |
| Auto-cancel | PENDING > 24 jam → otomatis CANCELLED |
| Denda keterlambatan | Rp 1.000/hari setelah due date |
| Atomic reservation | Copy di-RESERVED bersamaan dengan Borrowing dibuat |

---

## Pemisahan Akses Berdasarkan Role

| Endpoint / Aksi | SISWA | PETUGAS | ADMIN |
|---|:---:|:---:|:---:|
| Register (butuh NISN) | ✓ | — | — |
| Login | ✓ | ✓ | ✓ |
| Lihat buku & katalog | ✓ | ✓ | ✓ |
| Ajukan peminjaman | ✓ | — | — |
| Batalkan PENDING | ✓ | — | — |
| Ajukan pengembalian | ✓ | — | — |
| Lihat riwayat peminjaman | milik sendiri | semua | semua |
| Approve/Reject pinjam | — | ✓ | ✓ |
| Tandai buku diambil | — | ✓ | ✓ |
| Verifikasi pengembalian | — | ✓ | ✓ |
| Proses pembayaran denda | — | ✓ | ✓ |
| Rekap denda | — | ✓ | ✓ |
| Scan check-in/checkout | — | ✓ | ✓ |
| Lihat data kunjungan | — | ✓ | ✓ |
| CRUD buku & kategori | — | — | ✓ |
| Kelola NISN siswa | — | — | ✓ |
| Buat akun Petugas | — | — | ✓ |
| Export data CSV | — | — | ✓ |
