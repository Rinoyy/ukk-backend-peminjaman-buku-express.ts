# Backend API (express-qr-backend) — Alur Teknis

---

## Tech Stack

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Node.js | ~20.x | Runtime |
| Express | 5.x | Web framework |
| TypeScript | ~5.x | Type safety |
| Prisma | ~6.x | ORM untuk database |
| MySQL | 8.x | Database relasional |
| jsonwebtoken | ~9.x | JWT generation & verification |
| bcryptjs | ~3.x | Password hashing |
| qrcode | ~1.x | Generate QR code (base64) |
| multer | ~2.x | File upload (gambar buku) |
| node-cron | ~4.x | Scheduled jobs |
| cors | ~2.x | Cross-origin resource sharing |

---

## Status & Enum Sistem

### BorrowStatus

| Nilai | Keterangan |
|---|---|
| `PENDING` | Menunggu persetujuan (auto-cancel 24 jam) |
| `BORROWED` | Disetujui dan sedang dipinjam |
| `RETURN_PENDING` | Siswa ajukan pengembalian |
| `RETURNED` | Pengembalian diverifikasi |
| `REJECTED` | Ditolak admin/petugas |
| `CANCELLED` | Dibatalkan |

### CopyStatus (BookCopy)

| Nilai | Keterangan |
|---|---|
| `AVAILABLE` | Tersedia untuk dipinjam |
| `RESERVED` | Diblok sementara (ada PENDING) |
| `BORROWED` | Sedang dipinjam |
| `DAMAGED` | Dikembalikan rusak |
| `LOST` | Dinyatakan hilang |

---

## Struktur Proyek

```
express-qr-backend/
├── src/
│   ├── server.ts               # Entry point: start HTTP server di PORT
│   ├── app.ts                  # Express setup: middleware + routes mounting
│   ├── prisma.ts               # Singleton Prisma client instance
│   ├── cron.ts                 # Cron job: auto-cancel pending borrowings > 24 jam
│   │
│   ├── routes/                 # Route definitions (URL mapping)
│   │   ├── auth.routes.ts      # /api/auth
│   │   ├── book.routes.ts      # /api/books
│   │   ├── borrow.routes.ts    # /api/borrow
│   │   ├── user.routes.ts      # /api/users
│   │   ├── visit.routes.ts     # /api/visits
│   │   ├── notification.routes.ts  # /api/notifications
│   │   ├── category.routes.ts  # /api/categories
│   │   ├── bookCopy.routes.ts  # /api/book-copies
│   │   ├── qr.ts               # /api/qr
│   │   └── export.routes.ts    # /api/export
│   │
│   ├── controllers/            # Business logic per domain
│   │   ├── auth.controller.ts          # register, login
│   │   ├── book.controller.ts          # CRUD buku + upload gambar
│   │   ├── borrow.controller.ts        # Controller terkompleks (~685 baris)
│   │   ├── user.controller.ts          # CRUD user + create petugas
│   │   ├── visit.controller.ts         # check-in, checkout, daftar kunjungan
│   │   ├── notification.controller.ts  # ambil + mark-read notifikasi
│   │   ├── category.controller.ts      # CRUD kategori
│   │   ├── bookCopy.controller.ts      # kelola eksemplar buku
│   │   └── export.controller.ts        # export CSV
│   │
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT verification + role checking
│   │
│   ├── utils/
│   │   ├── qr.ts               # QR code generation helper
│   │   └── helpers.ts          # calculateLateFee, calculateDueDate, dll
│   │
│   └── __tests__/
│       ├── helpers.test.ts     # Unit test fungsi kalkulasi (11 test)
│       └── auth.test.ts        # Unit test register & login (7 test)
│
├── prisma/
│   ├── schema.prisma           # Database schema (models + relations)
│   ├── seed.ts                 # Data awal: admin, NISN, kategori, buku
│   └── migrations/             # Auto-generated migration SQL files
│
├── uploads/                    # Folder upload gambar buku (Multer)
├── package.json
├── tsconfig.json
└── .env                        # DATABASE_URL, JWT_SECRET, PORT
```

---

## Alur Teknis: Request Lifecycle

Setiap HTTP request melewati lapisan berikut:

```
HTTP Request
     │
[1] Express App (app.ts)
     │  cors(), json(), urlencoded()
[2] Router (routes/*.ts)
     │  URL matching + method matching
[3] Auth Middleware (opsional, sesuai route)
     │  verifyToken() → decode JWT → req.user
     │  requireRole('ADMIN', ...) → cek role
[4] Controller (controllers/*.ts)
     │  Business logic + validasi input
[5] Prisma ORM (prisma.ts)
     │  SQL query ke MySQL
[6] MySQL Database
     │
[5] Prisma response → JavaScript object
     │
[4] Controller → res.json(data)
     │
HTTP Response
```

---

## Alur Teknis: Autentikasi & Otorisasi

### Registrasi Siswa

```typescript
// auth.controller.ts — register()
async function register(req, res) {
  const { nisn, username, password } = req.body

  // 1. Validasi input wajib
  if (!nisn || !password) return res.status(400).json({ message: 'nisn dan password wajib diisi' })

  // 2. Cek NISN di whitelist sekolah
  const studentNISN = await prisma.studentNISN.findUnique({ where: { nisn } })
  if (!studentNISN) return res.status(403).json({ message: 'NISN tidak terdaftar di sekolah' })

  // 3. Cek NISN belum dipakai
  const existing = await prisma.user.findUnique({ where: { nisn } })
  if (existing) return res.status(400).json({ message: 'NISN sudah digunakan' })

  // 4. Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // 5. Buat user di database
  const user = await prisma.user.create({
    data: { username, nisn, password: hashedPassword, role: 'SISWA' }
  })

  // 6. Generate QR Code dari userId
  const qrCode = await QRCode.toDataURL(String(user.id))
  await prisma.user.update({ where: { id: user.id }, data: { qrCode } })

  res.status(201).json({ message: 'User registered successfully', user })
}
```

### Auth Middleware

```typescript
// middlewares/auth.middleware.ts

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded  // { userId, role }
    next()
  } catch {
    res.status(401).json({ message: 'Token tidak valid atau kadaluarsa' })
  }
}

export const requireRole = (...roles: string[]) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' })
  }
  next()
}
```

### Contoh Route dengan Middleware

```typescript
// routes/borrow.routes.ts
router.get('/',                   verifyToken,                              borrowController.getBorrowings)
router.post('/',                  verifyToken, requireRole('SISWA'),        borrowController.borrowBook)
router.patch('/:id/cancel',       verifyToken, requireRole('SISWA'),        borrowController.cancelBorrow)
router.patch('/:id/approve',      verifyToken, requireRole('ADMIN','PETUGAS'), borrowController.handleBorrowRequest)
router.patch('/:id/pickup',       verifyToken, requireRole('ADMIN','PETUGAS'), borrowController.markPickedUp)
router.patch('/:id/return',       verifyToken, requireRole('SISWA'),        borrowController.returnBookRequest)
router.patch('/:id/verify-return',verifyToken, requireRole('ADMIN','PETUGAS'), borrowController.handleReturnRequest)
router.post('/:id/pay-fine',      verifyToken, requireRole('ADMIN','PETUGAS'), borrowController.payFine)
```

---

## Alur Teknis: Borrow Controller (Terkompleks)

### borrowBook() — Siswa ajukan peminjaman

```typescript
// borrow.controller.ts — borrowBook()
const LATE_FEE_PER_DAY = 1000   // Rp 1.000/hari
const LOAN_DURATION_DAYS = 7    // 7 hari

async function borrowBook(req, res) {
  const { bookId } = req.body
  const userId = req.user.userId

  // 1. Cek eligibilitas: tidak ada borrowing aktif
  const activeBorrow = await prisma.borrowing.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'BORROWED', 'RETURN_PENDING'] }
    }
  })
  if (activeBorrow) {
    return res.status(400).json({ message: 'Masih ada peminjaman aktif' })
  }

  // 2. Cek eligibilitas: tidak ada denda belum dibayar
  const unpaidFine = await prisma.borrowing.findFirst({
    where: { userId, totalFine: { gt: 0 }, isPaid: false }
  })
  if (unpaidFine) {
    return res.status(400).json({ message: 'Masih ada denda yang belum dilunasi' })
  }

  // 3. Cari salinan buku yang tersedia (FIFO: copyNumber terkecil)
  const availableCopy = await prisma.bookCopy.findFirst({
    where: { bookId, status: 'AVAILABLE' },
    orderBy: { copyNumber: 'asc' }
  })
  if (!availableCopy) {
    return res.status(400).json({ message: 'Tidak ada salinan buku yang tersedia' })
  }

  // 4. Buat peminjaman + reservasi copy dalam satu transaction (atomic)
  const [borrowing] = await prisma.$transaction([
    prisma.borrowing.create({
      data: { userId, bookCopyId: availableCopy.id, status: 'PENDING' }
    }),
    prisma.bookCopy.update({
      where: { id: availableCopy.id },
      data: { status: 'RESERVED' }
    })
  ])

  res.status(201).json(borrowing)
}
```

**Poin penting:**
- Sistem **otomatis memilih** copy yang AVAILABLE — siswa hanya mengirim `bookId`
- Copy langsung di-`RESERVED` atomically bersamaan dengan pembuatan Borrowing
- Mencegah race condition (dua siswa meminjam copy yang sama)

---

### handleBorrowRequest() — Admin approve/reject

```typescript
async function handleBorrowRequest(req, res) {
  const { id } = req.params
  const { status, rejectReason } = req.body   // 'BORROWED' atau 'REJECTED'

  if (status === 'BORROWED') {
    // APPROVE
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS)  // +7 hari

    await prisma.$transaction([
      prisma.borrowing.update({
        where: { id: Number(id) },
        data: { status: 'BORROWED', borrowDate: new Date(), dueDate }
      }),
      prisma.bookCopy.update({
        where: { id: borrowing.bookCopyId },
        data: { status: 'BORROWED' }
      }),
      prisma.notification.create({
        data: {
          userId: borrowing.userId,
          title: 'Peminjaman Disetujui',
          message: `Ambil buku dalam 2 hari.`,
          type: 'BORROW_APPROVED'
        }
      })
    ])
  } else if (status === 'REJECTED') {
    // REJECT — copy dikembalikan ke AVAILABLE
    await prisma.$transaction([
      prisma.borrowing.update({
        where: { id: Number(id) },
        data: { status: 'REJECTED', rejectReason }
      }),
      prisma.bookCopy.update({
        where: { id: borrowing.bookCopyId },
        data: { status: 'AVAILABLE' }
      }),
      prisma.notification.create({
        data: {
          userId: borrowing.userId,
          title: 'Peminjaman Ditolak',
          message: rejectReason || 'Peminjaman ditolak',
          type: 'BORROW_REJECTED'
        }
      })
    ])
  }

  res.json({ message: 'Status peminjaman diperbarui' })
}
```

---

### handleReturnRequest() — Admin verifikasi pengembalian

```typescript
async function handleReturnRequest(req, res) {
  const { id } = req.params
  const { condition, damageFee = 0 } = req.body  // condition: 'GOOD'|'DAMAGED'|'LOST'

  const borrowing = await prisma.borrowing.findUnique({
    where: { id: Number(id) }
  })

  const actualReturn = new Date()

  // Hitung keterlambatan
  const daysLate = Math.ceil(
    (actualReturn.getTime() - borrowing.dueDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const lateFee = Math.max(0, daysLate) * LATE_FEE_PER_DAY
  const totalFine = lateFee + Number(damageFee)

  // Tentukan status copy berdasarkan kondisi buku
  const newCopyStatus = condition === 'GOOD'    ? 'AVAILABLE'
                      : condition === 'DAMAGED' ? 'DAMAGED'
                      : 'LOST'

  await prisma.$transaction([
    prisma.borrowing.update({
      where: { id: Number(id) },
      data: {
        status: 'RETURNED',
        actualReturnDate: actualReturn,
        condition,
        lateFee,
        damageFee: Number(damageFee),
        totalFine,
        isPaid: totalFine === 0   // otomatis lunas jika tidak ada denda
      }
    }),
    prisma.bookCopy.update({
      where: { id: borrowing.bookCopyId },
      data: { status: newCopyStatus }
    })
  ])

  res.json({ message: 'Pengembalian terverifikasi', lateFee, damageFee, totalFine })
}
```

---

### payFine() — Proses pembayaran denda

```typescript
async function payFine(req, res) {
  const { id } = req.params
  const { amountPaid } = req.body

  const borrowing = await prisma.borrowing.findUnique({ where: { id: Number(id) } })

  if (Number(amountPaid) < borrowing.totalFine) {
    return res.status(400).json({ message: 'Jumlah bayar kurang dari total denda' })
  }

  const change = Number(amountPaid) - borrowing.totalFine

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        borrowingId: Number(id),
        amount: borrowing.totalFine,
        amountPaid: Number(amountPaid),
        change,
        paidById: req.user.userId
      }
    }),
    prisma.borrowing.update({
      where: { id: Number(id) },
      data: { isPaid: true }
    })
  ])

  res.json({ message: 'Pembayaran berhasil', totalFine: borrowing.totalFine, amountPaid, change })
}
```

---

## Alur Teknis: Helper Functions

```typescript
// src/utils/helpers.ts

const LATE_FEE_PER_DAY = 1000
const LOAN_DURATION_DAYS = 7
const PICKUP_DEADLINE_DAYS = 2

// Hitung denda keterlambatan
export function calculateLateFee(dueDate: Date, returnDate: Date): number {
  const daysLate = Math.ceil((returnDate.getTime() - dueDate.getTime()) / 86_400_000)
  return Math.max(0, daysLate) * LATE_FEE_PER_DAY
}

// Hitung tanggal jatuh tempo dari tanggal disetujui
export function calculateDueDate(borrowDate: Date): Date {
  const due = new Date(borrowDate)
  due.setDate(due.getDate() + LOAN_DURATION_DAYS)
  return due
}

// Hitung batas pengambilan buku
export function calculatePickupDeadline(approvalDate: Date): Date {
  const deadline = new Date(approvalDate)
  deadline.setDate(deadline.getDate() + PICKUP_DEADLINE_DAYS)
  return deadline
}

// Cek apakah PENDING sudah expired (> 24 jam)
export function isExpiredPending(createdAt: Date): boolean {
  const age = Date.now() - createdAt.getTime()
  return age > 24 * 60 * 60 * 1000   // lebih dari 24 jam
}
```

---

## Alur Teknis: Cron Job

```typescript
// cron.ts — Berjalan setiap jam: '0 * * * *'
import cron from 'node-cron'
import prisma from './prisma'

cron.schedule('0 * * * *', async () => {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Cari semua PENDING yang sudah lebih dari 24 jam
  const expiredBorrowings = await prisma.borrowing.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoffTime } },
    include: { bookCopy: true }
  })

  console.log(`[CRON] Found ${expiredBorrowings.length} expired borrowings`)

  for (const borrowing of expiredBorrowings) {
    await prisma.$transaction([
      prisma.borrowing.update({
        where: { id: borrowing.id },
        data: { status: 'CANCELLED' }
      }),
      prisma.bookCopy.update({
        where: { id: borrowing.bookCopyId },
        data: { status: 'AVAILABLE' }
      })
    ])
  }
})
```

---

## Database Schema (Prisma — Aktual)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  nisn      String?  @unique
  password  String
  role      Role     @default(SISWA)
  qrCode    String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  borrowings    Borrowing[]
  visits        Visit[]
  notifications Notification[]
  payments      Payment[]      @relation("ProcessedBy")
}

model StudentNISN {
  id        Int      @id @default(autoincrement())
  nisn      String   @unique
  name      String
  createdAt DateTime @default(now())
}

model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  books       Book[]
}

model Book {
  id          Int       @id @default(autoincrement())
  title       String
  author      String
  categoryId  Int?
  description String?   @db.Text
  image       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    Category? @relation(fields: [categoryId], references: [id])
  copies      BookCopy[]
}

model BookCopy {
  id          Int        @id @default(autoincrement())
  bookId      Int
  copyNumber  Int
  qrCode      String?    @db.Text
  status      CopyStatus @default(AVAILABLE)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  book        Book       @relation(fields: [bookId], references: [id], onDelete: Cascade)
  borrowings  Borrowing[]

  @@unique([bookId, copyNumber])
}

model Borrowing {
  id               Int          @id @default(autoincrement())
  userId           Int
  bookCopyId       Int
  status           BorrowStatus @default(PENDING)
  borrowDate       DateTime?
  dueDate          DateTime?
  actualReturnDate DateTime?
  condition        String?
  rejectReason     String?
  lateFee          Int          @default(0)
  damageFee        Int          @default(0)
  totalFine        Int          @default(0)
  isPickedUp       Boolean      @default(false)
  isPaid           Boolean      @default(false)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  user      User      @relation(fields: [userId], references: [id])
  bookCopy  BookCopy  @relation(fields: [bookCopyId], references: [id])
  payment   Payment?
}

model Payment {
  id          Int      @id @default(autoincrement())
  borrowingId Int      @unique
  amount      Int
  amountPaid  Int
  change      Int
  paidAt      DateTime @default(now())
  paidById    Int

  borrowing   Borrowing @relation(fields: [borrowingId], references: [id])
  paidBy      User      @relation("ProcessedBy", fields: [paidById], references: [id])
}

model Visit {
  id           Int       @id @default(autoincrement())
  userId       Int
  visitDate    DateTime  @default(now())
  checkoutDate DateTime?
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id])
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    Int
  title     String
  message   String           @db.Text
  type      NotificationType
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user      User             @relation(fields: [userId], references: [id])
}

enum Role            { ADMIN PETUGAS SISWA }
enum CopyStatus      { AVAILABLE RESERVED BORROWED DAMAGED LOST }
enum BorrowStatus    { PENDING BORROWED RETURN_PENDING RETURNED REJECTED CANCELLED }
enum NotificationType { BORROW_APPROVED BORROW_REJECTED PICKUP_REMINDER GENERAL }
```

---

## Prisma Transaction Pattern

Operasi yang mengubah lebih dari 1 tabel dilakukan dalam satu **transaction** untuk menjaga konsistensi data:

```typescript
// Jika salah satu operasi gagal, seluruh transaction di-rollback otomatis
await prisma.$transaction([
  prisma.borrowing.update({ where: { id }, data: { status: 'BORROWED', dueDate } }),
  prisma.bookCopy.update({ where: { id: copyId }, data: { status: 'BORROWED' } }),
  prisma.notification.create({ data: { userId, type: 'BORROW_APPROVED', ... } })
])
```

---

## API Endpoints Lengkap

### Auth
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| POST | `/api/auth/register` | ❌ | — | Daftar siswa |
| POST | `/api/auth/login` | ❌ | — | Login semua role |

### Books
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/books` | ✓ | All | Daftar buku + stok |
| GET | `/api/books/:id` | ✓ | All | Detail + semua copy |
| POST | `/api/books` | ✓ | ADMIN | Tambah buku + generate copies |
| PUT | `/api/books/:id` | ✓ | ADMIN | Update buku |
| DELETE | `/api/books/:id` | ✓ | ADMIN | Hapus buku + copies |

### Book Copies
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/book-copies/:bookId` | ✓ | All | Semua copy dari buku |
| POST | `/api/book-copies` | ✓ | ADMIN | Tambah copy baru |
| PATCH | `/api/book-copies/:id/status` | ✓ | ADMIN | Update status manual |
| DELETE | `/api/book-copies/:id` | ✓ | ADMIN | Hapus copy |

### Borrowings
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/borrow` | ✓ | All | Semua / milik sendiri |
| GET | `/api/borrow/check-eligibility` | ✓ | SISWA | Cek bisa pinjam |
| GET | `/api/borrow/my-fines` | ✓ | SISWA | Denda belum lunas |
| GET | `/api/borrow/fines-recap` | ✓ | ADMIN/PETUGAS | Rekap denda |
| POST | `/api/borrow` | ✓ | SISWA | Ajukan pinjam |
| PATCH | `/api/borrow/:id/cancel` | ✓ | SISWA | Batalkan PENDING |
| PATCH | `/api/borrow/:id/approve` | ✓ | ADMIN/PETUGAS | Setujui/Tolak |
| PATCH | `/api/borrow/:id/pickup` | ✓ | ADMIN/PETUGAS | Tandai sudah diambil |
| PATCH | `/api/borrow/:id/return` | ✓ | SISWA | Ajukan pengembalian |
| PATCH | `/api/borrow/:id/verify-return` | ✓ | ADMIN/PETUGAS | Verifikasi + hitung denda |
| POST | `/api/borrow/:id/pay-fine` | ✓ | ADMIN/PETUGAS | Proses pembayaran |

### Visits
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| POST | `/api/visits/checkin` | ✓ | ADMIN/PETUGAS | Check-in via QR |
| POST | `/api/visits/checkout` | ✓ | ADMIN/PETUGAS | Check-out via QR |
| GET | `/api/visits` | ✓ | ADMIN/PETUGAS | Semua kunjungan |
| GET | `/api/visits/today/count` | ✓ | ADMIN/PETUGAS | Jumlah hari ini |

### Lainnya
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET/POST/PUT/DELETE | `/api/categories` | varies | All/ADMIN | Manajemen kategori |
| GET/POST/DELETE | `/api/users` | ✓ | ADMIN | Manajemen user |
| GET | `/api/notifications` | ✓ | Login | Notifikasi saya |
| PATCH | `/api/notifications/:id/read` | ✓ | Login | Tandai dibaca |
| PATCH | `/api/notifications/read-all` | ✓ | Login | Tandai semua dibaca |
| GET | `/api/qr?text=...` | ❌ | — | Generate QR image |
| GET | `/api/export/*` | ✓ | ADMIN/PETUGAS | Export CSV |

---

## Environment Variables

```env
# .env
DATABASE_URL="mysql://root:root@localhost:8889/perpustakaan"
JWT_SECRET="supersecret_should_be_changed"
PORT=3000
```

---

## Development & Running

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate deploy

# Isi data awal (admin + NISN + buku)
npm run seed

# Development dengan auto-reload
npm run dev

# Build TypeScript ke JavaScript
npm run build

# Production
npm start
```

Server berjalan di: `http://localhost:3000`
