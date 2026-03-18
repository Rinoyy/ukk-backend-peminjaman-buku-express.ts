# Default Accounts

Akun-akun ini dibuat otomatis saat menjalankan `npx prisma db seed`.

---

## Admin

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |
| Role     | `ADMIN`    |

Login melalui dashboard di `http://localhost:5173`.

---

## Catatan

- Password disimpan di database dalam bentuk hash bcrypt (salt rounds: 10).
- `JWT_SECRET` default di `.env` adalah `supersecret_should_be_changed` — **ganti sebelum deploy ke production**.
- Tidak ada field email pada model user; autentikasi menggunakan username + password.

---

## Cara Seed Ulang

```bash
cd express-qr-backend
npx prisma db seed
```
