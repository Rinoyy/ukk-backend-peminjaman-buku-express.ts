# Default Accounts

Akun-akun ini dibuat otomatis saat menjalankan `npm run seed`.

---

## Admin

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |
| Role     | `ADMIN`    |

Login melalui dashboard di `http://localhost:5173`.

---

## Guru

| Field    | Value     |
|----------|-----------|
| Username | `guru`    |
| Password | `guru123` |
| Role     | `GURU`    |

Login melalui web members di `http://localhost:5174`.

---

## Staff

| Field    | Value      |
|----------|------------|
| Username | `staff`    |
| Password | `staff123` |
| Role     | `STAFF`    |

Login melalui web members di `http://localhost:5174`.

---

## Catatan

- Password disimpan dalam bentuk hash bcrypt (salt rounds: 10).
- `JWT_SECRET` default di `.env` adalah `supersecret_should_be_changed` — **ganti sebelum deploy ke production**.
- Tidak ada field email pada model user; autentikasi Admin/Petugas menggunakan `username + password`, Siswa menggunakan `nisn + password`.
- Setelah seed, admin perlu menambahkan NISN siswa ke tabel `StudentNISN` sebelum siswa bisa mendaftar.

---

## Cara Seed Ulang

```bash
cd express-qr-backend
npm run seed
```

> **Peringatan:** Seed akan menghapus semua data yang ada sebelum mengisi ulang.

---

## Data yang Di-generate Seed

1. Kosongkan semua tabel (urutan aman sesuai foreign key)
2. Isi whitelist NISN siswa (`StudentNISN`)
3. Buat akun default:
   - Admin (`admin` / `admin123`)
   - Guru (`guru` / `guru123`)
   - Staff (`staff` / `staff123`)
4. Isi kategori buku default
5. Isi buku beserta salinan fisik + QR Code masing-masing
