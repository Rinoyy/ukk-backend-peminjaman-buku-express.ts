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
- Pengelolaan salinan buku (Book Copies) dengan status `AVAILABLE`, `BORROWED`, `DAMAGED`, atau `LOST`.
- Integrasi QR Code untuk setiap user dan salinan buku guna memudahkan proses pemindaian.

### 🔄 Sistem Sirkulasi & Denda
- Alur peminjaman buku mulai dari pengajuan hingga pengembalian.
- Kalkulasi denda otomatis jika buku terlambat dikembalikan.
- Pencatatan kondisi buku saat dikembalikan untuk menentukan denda kerusakan.

### 🤖 Automasi (Cron Jobs)
- Sistem pemantauan otomatis untuk memperbarui status keterlambatan dan menghitung akumulasi denda setiap hari.

### 📊 Log Kunjungan
- Pencatatan riwayat kunjungan pengguna ke perpustakaan untuk kebutuhan statistik.

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
4. Jalankan Server:
   ```bash
   npm run dev
   ```

---
*Dokumentasi ini memberikan gambaran umum mengenai fungsionalitas Backend API.*
