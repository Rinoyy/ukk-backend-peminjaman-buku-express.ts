import { Router } from 'express';
import {
    borrowBook,
    getBorrowings,
    handleBorrowRequest,
    returnBookRequest,
    handleReturnRequest,
    checkEligibility,
    getMyFines,
    payFine,
    getFinesRecap,
    cancelBorrow,
    markPickedUp,
} from '../controllers/borrow.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Semua Role (ADMIN & SISWA) ───────────────────────────────
// GET /api/borrow — admin dapat semua, siswa hanya milik sendiri
router.get('/', authenticateJWT, getBorrowings);

// ── Siswa ────────────────────────────────────────────────────
// GET  /api/borrow/check-eligibility — cek apakah siswa bisa meminjam
// GET  /api/borrow/my-fines          — daftar denda belum dibayar milik siswa
// POST /api/borrow                   — ajukan peminjaman (body: { bookId })
// POST /api/borrow/:id/cancel        — batalkan peminjaman PENDING
// POST /api/borrow/:id/return        — ajukan pengembalian
router.get('/check-eligibility', authenticateJWT, authorizeRole(['SISWA']), checkEligibility);
router.get('/my-fines', authenticateJWT, authorizeRole(['SISWA']), getMyFines);
router.post('/', authenticateJWT, authorizeRole(['SISWA']), borrowBook);
router.post('/:id/cancel', authenticateJWT, authorizeRole(['SISWA']), cancelBorrow);
router.post('/:id/return', authenticateJWT, authorizeRole(['SISWA']), returnBookRequest);

// ── Admin ────────────────────────────────────────────────────
// GET  /api/borrow/fines-recap       — rekap denda (lunas & belum)
// POST /api/borrow/:id/approve       — setujui/tolak peminjaman (body: { status, rejectReason? })
// POST /api/borrow/:id/pickup        — tandai buku sudah diambil siswa
// POST /api/borrow/:id/verify-return — verifikasi pengembalian (body: { status, condition, damageFee? })
// POST /api/borrow/:id/pay           — proses pembayaran denda (body: { amountPaid })
router.get('/fines-recap', authenticateJWT, authorizeRole(['ADMIN']), getFinesRecap);
router.post('/:id/approve', authenticateJWT, authorizeRole(['ADMIN']), handleBorrowRequest);
router.post('/:id/pickup', authenticateJWT, authorizeRole(['ADMIN']), markPickedUp);
router.post('/:id/verify-return', authenticateJWT, authorizeRole(['ADMIN']), handleReturnRequest);
router.post('/:id/pay', authenticateJWT, authorizeRole(['ADMIN']), payFine);

export default router;
