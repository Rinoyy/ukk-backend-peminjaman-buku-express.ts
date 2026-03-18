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
    cancelBorrow
} from '../controllers/borrow.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getBorrowings);

// Siswa
router.get('/check-eligibility', authenticateJWT, authorizeRole(['SISWA']), checkEligibility);
router.get('/my-fines', authenticateJWT, authorizeRole(['SISWA']), getMyFines);
router.post('/', authenticateJWT, authorizeRole(['SISWA']), borrowBook);
router.post('/:id/cancel', authenticateJWT, authorizeRole(['SISWA']), cancelBorrow);
router.post('/:id/return', authenticateJWT, authorizeRole(['SISWA']), returnBookRequest);

// Admin
router.post('/:id/approve', authenticateJWT, authorizeRole(['ADMIN']), handleBorrowRequest); // body: { status: 'BORROWED' | 'REJECTED' }
router.post('/:id/verify-return', authenticateJWT, authorizeRole(['ADMIN']), handleReturnRequest); // body: { status, condition, damageFee }
router.get('/fines-recap', authenticateJWT, authorizeRole(['ADMIN']), getFinesRecap);
router.post('/:id/pay', authenticateJWT, authorizeRole(['ADMIN']), payFine); // body: { amountPaid }

export default router;
