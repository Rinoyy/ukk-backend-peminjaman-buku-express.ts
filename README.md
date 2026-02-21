# Backend API Perpustakaan Digital 🚀

Repositori ini berisi kode sumber untuk API Backend Perpustakaan Digital. API ini dibangun menggunakan **Node.js** dengan framework **Express** dan menggunakan **Prisma ORM** untuk berinteraksi dengan database **MySQL**.

## 🏗 Arsitektur & Teknologi
API ini berfungsi sebagai penyedia data pusat untuk aplikasi Dashboard (Admin/Petugas) dan Web Member (Siswa).

- **Runtime:** Node.js
- **Framework:** Express.js
- **Bahasa:** TypeScript
- **Database:** MySQL
- **ORM:** Prisma
- **Autentikasi:** JSON Web Token (JWT)
- **Library Lain:** BcryptJS (Hashing), QRCode (Generator), Node-Cron (Automasi).

## 💡 Fitur Utama

### 🔐 Autentikasi & Keamanan
- Registrasi dan Login dengan sistem Role-based Access Control (RBAC).
- Role yang tersedia: `ADMIN`, `PETUGAS`, dan `SISWA`.
- Proteksi route menggunakan middleware JWT.

### 📚 Manajemen Data Buku
- CRUD Data Buku dan Kategori.
- Pengelolaan salinan buku (Book Copies) dengan status `AVAILABLE`, `BORROWED`, `RESERVED`, `DAMAGED`, atau `LOST`.
- Integrasi QR Code untuk setiap user dan salinan buku guna memudahkan proses pemindaian.

### 🔄 Sistem Sirkulasi & Denda
- Alur peminjaman buku dengan **reservasi copy otomatis** untuk mencegah double-booking:
  - `PENDING` → Copy buku langsung di-`RESERVED`
  - `BORROWED` → Copy buku berstatus `BORROWED`, due date 7 hari
  - `RETURN_PENDING` → Siswa request pengembalian
  - `RETURNED` → Admin/Petugas verifikasi + cek kondisi buku
  - `REJECTED` → Pengajuan ditolak (otomatis/manual) + copy dikembalikan ke `AVAILABLE`
- Kalkulasi denda otomatis jika buku terlambat dikembalikan (Rp 1.000/hari).
- Denda kerusakan/kehilangan buku dengan pencatatan kondisi (`GOOD`, `DAMAGED`, `LOST`).
- Pencatatan `rejectReason` saat penolakan untuk audit trail.

### 🤖 Automasi (Cron Jobs)
- Sistem pemantauan otomatis setiap jam untuk membatalkan pengajuan PENDING yang melebihi 24 jam.
- Copy buku yang direservasi akan otomatis dikembalikan ke status `AVAILABLE`.

### 📊 Log Kunjungan
- Pencatatan riwayat kunjungan pengguna ke perpustakaan via scan QR Code.

### 📥 Export Data (CSV)
Export seluruh data penting ke format CSV untuk kebutuhan pelaporan:

| Endpoint | Deskripsi |
|---|---|
| `GET /api/export/books` | Data buku + jumlah copy per status |
| `GET /api/export/categories` | Data kategori + jumlah buku |
| `GET /api/export/borrowings` | Peminjaman aktif (PENDING/BORROWED/RETURN_PENDING) |
| `GET /api/export/returns` | Riwayat pengembalian (RETURNED) |
| `GET /api/export/users` | Data pengguna (tanpa password) |
| `GET /api/export/damaged` | Barang rusak/hilang + peminjam terakhir |
| `GET /api/export/visits` | Log kunjungan siswa |

> Semua endpoint export memerlukan autentikasi dan role `ADMIN` atau `PETUGAS`.

## 🛠 Panduan Instalasi

### Prasyarat
- Node.js terinstal di sistem.
- Database MySQL yang sudah berjalan.

### Langkah-langkah
1. Instal dependensi:
   ```bash
   npm install
   ```
2. Konfigurasi Environment:
   Buat file `.env` dan atur `DATABASE_URL` ke database MySQL Anda.
   ```env
   DATABASE_URL="mysql://username:password@localhost:3306/db_name"
   JWT_SECRET="your_secret_key"
   ```
3. Sinkronisasi Database (Prisma):
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Seed Data Awal (opsional):
   ```bash
   npx prisma db seed
   ```
5. Jalankan Server:
   ```bash
   npm run dev
   ```

---
*Dokumentasi ini memberikan gambaran umum mengenai fungsionalitas Backend API.*
