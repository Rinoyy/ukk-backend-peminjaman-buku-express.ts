# Backend API (express-qr-backend) — Alur Teknis

---

## Tech Stack

| Teknologi | Versi | Kegunaan |
|---|---|---|
| Node.js | ~20.x | Runtime |
| Express | 5.x | Web framework |
| TypeScript | ~5.x | Type safety |
| Prisma | ~5.x | ORM untuk database |
| MySQL | 8.x | Database relasional |
| jsonwebtoken | ~9.x | JWT generation & verification |
| bcryptjs | ~2.x | Password hashing |
| qrcode | ~1.x | Generate QR code (base64) |
| multer | ~1.x | File upload (gambar buku) |
| node-cron | ~3.x | Scheduled jobs |
| cors | ~2.x | Cross-origin resource sharing |

---

## Struktur Proyek

```
express-qr-backend/
├── src/
│   ├── server.ts               # Entry point: start HTTP server
│   ├── app.ts                  # Express setup: middleware + routes mounting
│   ├── prisma.ts               # Singleton Prisma client instance
│   ├── cron.ts                 # Cron job: auto-cancel pending borrowings
│   │
│   ├── routes/                 # Route definitions (URL mapping)
│   │   ├── auth.routes.ts      # /api/auth
│   │   ├── book.routes.ts      # /api/books
│   │   ├── borrow.routes.ts    # /api/borrow
│   │   ├── user.routes.ts      # /api/users
│   │   ├── visit.routes.ts     # /api/visits
│   │   ├── notification.routes.ts  # /api/notifications
│   │   ├── category.routes.ts  # /api/categories
│   │   ├── bookCopy.routes.ts  # /api/copies
│   │   ├── qr.ts               # /api/qr
│   │   └── export.routes.ts    # /api/export
│   │
│   ├── controllers/            # Business logic per domain
│   │   ├── auth.controller.ts
│   │   ├── book.controller.ts
│   │   ├── borrow.controller.ts    # Controller terkompleks
│   │   ├── user.controller.ts
│   │   ├── visit.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── category.controller.ts
│   │   ├── bookCopy.controller.ts
│   │   └── export.controller.ts
│   │
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT verification + role checking
│   │
│   └── utils/
│       └── qr.ts               # QR code generation helper
│
├── prisma/
│   ├── schema.prisma           # Database schema (models + relations)
│   └── migrations/             # Auto-generated migration files
│
├── uploads/                    # Folder upload gambar buku (Multer)
├── package.json
├── tsconfig.json
└── .env                        # DATABASE_URL, JWT_SECRET, PORT
```

---

## Alur Teknis: Request Lifecycle

Setiap HTTP request melewati lapisan berikut secara berurutan:

```
HTTP Request
     ↓
[1] Express App (app.ts)
     ↓ cors(), json(), urlencoded()
[2] Router (routes/*.ts)
     ↓ URL matching
[3] Auth Middleware (opsional)
     ↓ verifyToken(), requireRole()
[4] Controller (controllers/*.ts)
     ↓ Business logic
[5] Prisma ORM
     ↓ SQL query
[6] MySQL Database
     ↓
[5] Prisma response
     ↓
[4] Controller → res.json(data)
     ↓
HTTP Response
```

---

## Alur Teknis: Autentikasi & Otorisasi

### Registrasi

```typescript
// auth.controller.ts - register()
async function register(req, res) {
  const { name, nis, email, password } = req.body

  // 1. Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // 2. Buat user di database
  const user = await prisma.user.create({
    data: { name, nis, email, password: hashedPassword, role: 'SISWA' }
  })

  // 3. Generate QR Code dari userId
  const qrCode = await QRCode.toDataURL(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { qrCode } })

  // 4. Generate JWT token
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET)

  res.json({ token, user })
}
```

### Auth Middleware

```typescript
// middlewares/auth.middleware.ts
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Unauthorized' })

  const decoded = jwt.verify(token, JWT_SECRET)
  req.user = decoded  // { userId, role }
  next()
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
router.post('/', verifyToken, requireRole('SISWA'), borrowController.create)
router.patch('/:id/approve', verifyToken, requireRole('ADMIN'), borrowController.approve)
router.patch('/:id/return', verifyToken, requireRole('SISWA'), borrowController.requestReturn)
router.patch('/:id/verify-return', verifyToken, requireRole('ADMIN'), borrowController.verifyReturn)
```

---

## Alur Teknis: Borrow Controller (Terkompleks)

### create() — Siswa ajukan peminjaman

```typescript
async function create(req, res) {
  const { bookId } = req.body
  const userId = req.user.userId

  // 1. Cek eligibilitas: tidak ada borrowing aktif
  const activeBorrow = await prisma.borrowing.findFirst({
    where: { userId, status: { in: ['PENDING', 'BORROWED', 'RETURN_PENDING'] } }
  })
  if (activeBorrow) throw new Error('Masih ada peminjaman aktif')

  // 2. Cek eligibilitas: tidak ada fine belum bayar
  const unpaidFine = await prisma.borrowing.findFirst({
    where: { userId, isPaid: false, totalFine: { gt: 0 } }
  })
  if (unpaidFine) throw new Error('Masih ada denda belum dibayar')

  // 3. Cari salinan buku yang tersedia
  const availableCopy = await prisma.bookCopy.findFirst({
    where: { bookId, status: 'AVAILABLE' }
  })
  if (!availableCopy) throw new Error('Tidak ada salinan buku tersedia')

  // 4. Buat peminjaman + update status copy (transaction)
  const [borrowing] = await prisma.$transaction([
    prisma.borrowing.create({
      data: { userId, bookCopyId: availableCopy.id, status: 'PENDING', borrowDate: new Date() }
    }),
    prisma.bookCopy.update({
      where: { id: availableCopy.id },
      data: { status: 'RESERVED' }
    })
  ])

  res.json(borrowing)
}
```

### verifyReturn() — Admin verifikasi pengembalian

```typescript
async function verifyReturn(req, res) {
  const { id } = req.params
  const { condition, damageFee = 0 } = req.body

  const borrowing = await prisma.borrowing.findUnique({ where: { id } })
  const actualReturn = new Date()

  // Hitung keterlambatan
  const daysLate = Math.max(0,
    Math.floor((actualReturn - borrowing.dueDate) / (1000 * 60 * 60 * 24))
  )
  const lateFee = daysLate * 1000  // Rp 1.000/hari
  const totalFine = lateFee + Number(damageFee)

  // Update borrowing + book copy status
  const newCopyStatus = condition === 'GOOD' ? 'AVAILABLE'
                      : condition === 'DAMAGED' ? 'DAMAGED'
                      : 'LOST'

  await prisma.$transaction([
    prisma.borrowing.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturnDate: actualReturn,
        condition,
        lateFee,
        damageFee: Number(damageFee),
        totalFine,
        isPaid: totalFine === 0
      }
    }),
    prisma.bookCopy.update({
      where: { id: borrowing.bookCopyId },
      data: { status: newCopyStatus }
    })
  ])

  res.json({ message: 'Pengembalian terverifikasi', totalFine })
}
```

---

## Alur Teknis: Cron Job

```typescript
// cron.ts
import cron from 'node-cron'

// Jalankan setiap jam
cron.schedule('0 * * * *', async () => {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)  // 24 jam lalu

  // Cari semua PENDING yang sudah > 24 jam
  const expiredBorrowings = await prisma.borrowing.findMany({
    where: { status: 'PENDING', borrowDate: { lt: cutoffTime } },
    include: { bookCopy: true }
  })

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

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id            String        @id @default(cuid())
  name          String
  nis           String?       @unique
  email         String        @unique
  password      String
  role          Role          @default(SISWA)
  qrCode        String?
  borrowings    Borrowing[]
  visits        Visit[]
  notifications Notification[]
  payments      Payment[]
}

model Book {
  id          String     @id @default(cuid())
  title       String
  author      String
  description String?
  image       String?
  categoryId  String
  category    Category   @relation(fields: [categoryId], references: [id])
  copies      BookCopy[]
}

model BookCopy {
  id         String      @id @default(cuid())
  bookId     String
  book       Book        @relation(fields: [bookId], references: [id])
  status     CopyStatus  @default(AVAILABLE)
  qrCode     String?
  borrowings Borrowing[]
}

model Borrowing {
  id               String          @id @default(cuid())
  userId           String
  bookCopyId       String
  status           BorrowStatus    @default(PENDING)
  borrowDate       DateTime
  dueDate          DateTime?
  actualReturnDate DateTime?
  condition        ReturnCondition?
  lateFee          Float           @default(0)
  damageFee        Float           @default(0)
  totalFine        Float           @default(0)
  isPaid           Boolean         @default(false)
  user             User            @relation(fields: [userId], references: [id])
  bookCopy         BookCopy        @relation(fields: [bookCopyId], references: [id])
  payment          Payment?
}

model Payment {
  id          String    @id @default(cuid())
  borrowingId String    @unique
  userId      String
  amount      Float
  change      Float
  processedBy String
  createdAt   DateTime  @default(now())
  borrowing   Borrowing @relation(fields: [borrowingId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
}

model Visit {
  id        String   @id @default(cuid())
  userId    String
  visitedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  title     String
  message   String
  type      NotificationType
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id])
}

enum Role          { ADMIN SISWA PETUGAS }
enum CopyStatus    { AVAILABLE RESERVED BORROWED DAMAGED LOST }
enum BorrowStatus  { PENDING BORROWED RETURN_PENDING RETURNED REJECTED CANCELLED }
enum ReturnCondition { GOOD DAMAGED LOST }
enum NotificationType { BORROW_APPROVED BORROW_REJECTED PICKUP_REMINDER GENERAL }
```

---

## Prisma Transaction Pattern

Operasi yang mengubah lebih dari 1 tabel dilakukan dalam satu **transaction** untuk menjaga konsistensi data:

```typescript
// Contoh: approve peminjaman
await prisma.$transaction([
  prisma.borrowing.update({ where: { id }, data: { status: 'BORROWED', dueDate } }),
  prisma.bookCopy.update({ where: { id: copyId }, data: { status: 'BORROWED' } }),
  prisma.notification.create({ data: { userId, type: 'BORROW_APPROVED', ... } })
])
```

Jika salah satu operasi gagal, seluruh transaction di-rollback otomatis.

---

## API Endpoints Lengkap

### Auth
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| POST | `/api/auth/register` | ❌ | - | Daftar siswa |
| POST | `/api/auth/login` | ❌ | - | Login |

### Books
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/books` | ✓ | All | Daftar buku |
| GET | `/api/books/:id` | ✓ | All | Detail buku |
| POST | `/api/books` | ✓ | ADMIN | Tambah buku |
| PUT | `/api/books/:id` | ✓ | ADMIN | Update buku |
| DELETE | `/api/books/:id` | ✓ | ADMIN | Hapus buku |

### Borrowings
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/borrow` | ✓ | ADMIN | Semua peminjaman |
| GET | `/api/borrow/my` | ✓ | SISWA | Peminjaman milik saya |
| POST | `/api/borrow` | ✓ | SISWA | Ajukan pinjam |
| PATCH | `/api/borrow/:id/approve` | ✓ | ADMIN | Setujui |
| PATCH | `/api/borrow/:id/reject` | ✓ | ADMIN | Tolak |
| PATCH | `/api/borrow/:id/return` | ✓ | SISWA | Request return |
| PATCH | `/api/borrow/:id/verify-return` | ✓ | ADMIN | Verifikasi return |
| POST | `/api/borrow/:id/pay-fine` | ✓ | ADMIN | Bayar denda |

### Visits
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET | `/api/visits` | ✓ | ADMIN | Semua kunjungan |
| POST | `/api/visits/check-in` | ✓ | All | Check-in via QR |

### Lainnya
| Method | Endpoint | Auth | Role | Deskripsi |
|---|---|---|---|---|
| GET/POST | `/api/categories` | ✓ | All/ADMIN | Kategori buku |
| GET | `/api/notifications` | ✓ | SISWA | Notifikasi saya |
| PATCH | `/api/notifications/:id/read` | ✓ | SISWA | Tandai dibaca |
| GET | `/api/users` | ✓ | ADMIN | Semua user |
| GET/POST | `/api/copies` | ✓ | ADMIN | Book copies |

---

## Environment Variables

```env
# .env
DATABASE_URL="mysql://user:password@localhost:3306/perpustakaan_db"
JWT_SECRET="your-secret-key"
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
npx prisma migrate dev

# Development dengan auto-reload
npm run dev

# Build TypeScript
npm run build

# Production
npm start
```

### Server berjalan di: `http://localhost:3000`
