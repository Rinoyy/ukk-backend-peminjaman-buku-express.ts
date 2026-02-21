import { Router } from 'express';
import {
    exportBooks,
    exportCategories,
    exportBorrowings,
    exportReturns,
    exportUsers,
    exportDamaged,
    exportVisits
} from '../controllers/export.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// All export routes are restricted to ADMIN and PETUGAS
router.get('/books', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportBooks);
router.get('/categories', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportCategories);
router.get('/borrowings', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportBorrowings);
router.get('/returns', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportReturns);
router.get('/users', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportUsers);
router.get('/damaged', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportDamaged);
router.get('/visits', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), exportVisits);

export default router;
