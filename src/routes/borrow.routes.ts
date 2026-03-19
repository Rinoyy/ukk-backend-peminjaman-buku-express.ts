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

// ── Semua Role (ADMIN, PETUGAS, SISWA) — controller menangani filter per role ──
router.get('/', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS', 'SISWA']), getBorrowings);
router.get('/fines-recap', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), getFinesRecap);
router.post('/:id/approve', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), handleBorrowRequest);
router.post('/:id/pickup', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), markPickedUp);
router.post('/:id/verify-return', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), handleReturnRequest);
router.post('/:id/pay', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), payFine);

// ── Siswa ────────────────────────────────────────────────────
router.get('/check-eligibility', authenticateJWT, authorizeRole(['SISWA']), checkEligibility);
router.get('/my-fines', authenticateJWT, authorizeRole(['SISWA']), getMyFines);
router.post('/', authenticateJWT, authorizeRole(['SISWA']), borrowBook);
router.post('/:id/cancel', authenticateJWT, authorizeRole(['SISWA']), cancelBorrow);
router.post('/:id/return', authenticateJWT, authorizeRole(['SISWA']), returnBookRequest);

export default router;
