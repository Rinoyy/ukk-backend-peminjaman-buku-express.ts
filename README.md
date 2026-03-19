# Backend API — Perpustakaan Digital

Server API pusat untuk sistem perpustakaan digital dengan integrasi QR Code. Dibangun dengan **Node.js + Express + TypeScript + Prisma ORM + MySQL**.

---

## Arsitektur & Teknologi

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Node.js | ~20.x | Runtime |
| Express | 5.x | Web framework |
| TypeScript | ~5.x | Type safety |
| Prisma | ~6.x | ORM database |
| MySQL | 8.x | Database relasional |
| jsonwebtoken | ~9.x | JWT autentikasi |
| bcryptjs | ~3.x | Password hashing |
| qrcode | ~1.x | Generate QR Code base64 |
| multer | ~2.x | Upload gambar buku |
| node-cron | ~4.x | Scheduled jobs |

API ini melayani dua frontend:
- **Dashboard Admin** (port 5174) — untuk Admin dan Petugas
- **Portal Siswa** (port 5173) — untuk Siswa

---

## Fitur Utama

### Autentikasi & Role-Based Access Control
- 3 role: `ADMIN`, `PETUGAS`, `SISWA`
- Siswa daftar menggunakan NISN (wajib terdaftar di whitelist sekolah)
- Admin/Petugas login dengan username
- Proteksi route via JWT middleware

### Katalog Buku dengan BookCopy
- Satu judul buku (`Book`) memiliki banyak salinan fisik (`BookCopy`)
- Tiap copy punya nomor urut dan QR Code unik
- Status copy: `AVAILABLE` | `RESERVED` | `BORROWED` | `DAMAGED` | `LOST`

### Sistem Sirkulasi Peminjaman
Alur lengkap dengan reservasi copy otomatis untuk mencegah double-booking:

```
POST /borrow              → PENDING,  copy: RESERVED  (atomic transaction)
PATCH /:id/approve        → BORROWED, copy: BORROWED, dueDate +7 hari
PATCH /:id/pickup         → isPickedUp = true
PATCH /:id/return         → RETURN_PENDING
PATCH /:id/verify-return  → RETURNED + hitung denda otomatis
POST  /:id/pay-fine       → isPaid = true
```

**Eligibilitas pinjam** (dicek setiap request):
- Tidak ada borrowing aktif (PENDING/BORROWED/RETURN_PENDING)
- Tidak ada denda belum lunas

### Sistem Denda Otomatis
| Kondisi | Denda |
|---|---|
| Terlambat | Rp 1.000 × hari terlambat |
| Rusak | late fee + damageFee (input admin) |
| Hilang | late fee + biaya penggantian (input admin) |

### Automasi Cron Job
Berjalan setiap jam — membatalkan PENDING > 24 jam dan mengembalikan copy ke AVAILABLE.

### Log Kunjungan via QR
Check-in dan check-out kunjungan siswa ke perpustakaan menggunakan QR Code.

### Export Data CSV
| Endpoint | Data |
|---|---|
| `GET /api/export/books` | Buku + jumlah copy per status |
| `GET /api/export/categories` | Kategori + jumlah buku |
| `GET /api/export/borrowings` | Peminjaman aktif |
| `GET /api/export/returns` | Riwayat pengembalian + denda |
| `GET /api/export/users` | Data pengguna |
| `GET /api/export/damaged` | Buku rusak/hilang |
| `GET /api/export/visits` | Log kunjungan |

---

## Instalasi & Menjalankan

### Prasyarat
- Node.js 18+
- MySQL berjalan di `localhost:8889` (atau sesuaikan `DATABASE_URL`)

### Langkah Setup

```bash
# 1. Install dependencies
npm install

# 2. Terapkan migrasi database
npx prisma migrate deploy

# 3. Generate Prisma client
npx prisma generate

# 4. Isi data awal (admin + NISN + buku contoh)
npm run seed

# 5. Jalankan server development
npm run dev
```

Server berjalan di `http://localhost:3000`

### Environment Variables (`.env`)
```env
DATABASE_URL="mysql://root:root@localhost:8889/perpustakaan"
JWT_SECRET="supersecret_should_be_changed"
PORT=3000
```

### NPM Scripts
| Script | Fungsi |
|---|---|
| `npm run dev` | Development dengan auto-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Jalankan hasil build |
| `npm run seed` | Reset & isi ulang data awal |
| `npm test` | Jalankan unit test (18 test) |
| `npm run test:watch` | Test mode watch |

---

## Dokumentasi Lengkap

| File | Isi |
|---|---|
| [docs/business-flow.md](./docs/business-flow.md) | Alur bisnis semua domain |
| [docs/technical-flow.md](./docs/technical-flow.md) | Detail teknis, kode, schema |
| [docs/setup-guide.md](./docs/setup-guide.md) | Panduan instalasi + database |
| [docs/default-accounts.md](./docs/default-accounts.md) | Akun default setelah seed |
