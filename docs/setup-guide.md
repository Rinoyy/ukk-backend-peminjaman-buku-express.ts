# Setup Guide — express-qr-backend

Panduan ini menjelaskan cara menjalankan server, mengelola database, dan melakukan reset data.

---

## Prasyarat

- Node.js 18+
- MySQL berjalan di `localhost:8889`
- File `.env` berisi:
  ```
  DATABASE_URL="mysql://root:@localhost:8889/perpustakaan"
  JWT_SECRET="secret_kamu"
  ```

---

## Instalasi Awal

```bash
npm install
npx prisma generate
```

---

## Menjalankan Server

```bash
npm run dev
```

Server berjalan di `http://localhost:3000`

---

## Manajemen Database

### Melihat semua tabel (Prisma Studio)

```bash
npx prisma studio
```

Buka browser di `http://localhost:5555` — tampilan visual semua data.

---

### Menjalankan Migrasi (saat ada perubahan schema)

Setiap kali `prisma/schema.prisma` diubah, buat migrasi baru:

```bash
# 1. Buat file SQL migrasi di prisma/migrations/
npx prisma migrate dev --name nama_migrasi

# 2. Terapkan migrasi ke database
npx prisma migrate deploy

# 3. Generate ulang Prisma Client
npx prisma generate
```

> **Catatan:** Di lingkungan ini `migrate dev` tidak bisa dijalankan otomatis dari terminal non-interaktif. Gunakan cara manual (lihat bawah).

**Cara buat migrasi manual:**
1. Buat folder baru di `prisma/migrations/` dengan nama format `YYYYMMDDHHMMSS_nama_migrasi`
2. Buat file `migration.sql` di dalamnya, isi SQL-nya
3. Jalankan `npx prisma migrate deploy`
4. Jalankan `npx prisma generate`

---

### Mengosongkan Semua Tabel (Reset Data)

> ⚠️ **Hanya untuk development!** Semua data akan hilang permanen.

**Cara 1 — Jalankan seed (otomatis bersihkan + isi ulang):**
```bash
npm run seed
```

Seed sudah mencakup `deleteMany` untuk semua tabel, jadi data lama otomatis terhapus sebelum data baru diisi.

**Cara 2 — Reset penuh (drop + recreate semua tabel + seed):**
```bash
npx prisma migrate reset
```

Perintah ini akan meminta konfirmasi karena menghapus semua data.

---

### Mengisi Ulang Data (Seed)

```bash
npm run seed
```

Seed akan:
1. Kosongkan semua tabel (urutan aman sesuai foreign key)
2. Isi NISN siswa yang diizinkan mendaftar
3. Buat akun admin `admin / admin123`
4. Isi kategori buku
5. Isi buku + salinan fisik (beserta QR Code masing-masing)

---

### Menambah NISN Siswa Baru

NISN siswa disimpan di tabel `StudentNISN`. Ada dua cara menambahnya:

**Cara 1 — Lewat Prisma Studio:**
1. Jalankan `npx prisma studio`
2. Buka tabel `StudentNISN`
3. Klik `+ Add record`
4. Isi `nisn` dan `name`, simpan

**Cara 2 — Lewat seed.ts:**
Tambahkan entri baru di array `nisnList` di `prisma/seed.ts`, lalu jalankan `npm run seed`.

> Perhatian: `npm run seed` akan menghapus semua data lama.

---

## Akun Default Setelah Seed

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |

Ganti password admin setelah sistem naik ke production.

---

## Registrasi Siswa

Siswa mendaftar lewat endpoint `POST /api/auth/register` dengan body:

```json
{
  "username": "budi",
  "password": "password123",
  "nisn": "1234567890"
}
```

- Jika NISN tidak ada di tabel `StudentNISN` → ditolak
- Jika NISN sudah dipakai akun lain → ditolak
- Jika berhasil → akun dibuat + QR Code otomatis digenerate

---

## Urutan Setup dari Nol

```bash
# 1. Install dependencies
npm install

# 2. Terapkan semua migrasi ke database
npx prisma migrate deploy

# 3. Generate Prisma Client
npx prisma generate

# 4. Isi data awal
npm run seed

# 5. Jalankan server
npm run dev
```
