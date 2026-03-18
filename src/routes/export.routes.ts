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

// All export routes are restricted to ADMIN
router.get('/books', authenticateJWT, authorizeRole(['ADMIN']), exportBooks);
router.get('/categories', authenticateJWT, authorizeRole(['ADMIN']), exportCategories);
router.get('/borrowings', authenticateJWT, authorizeRole(['ADMIN']), exportBorrowings);
router.get('/returns', authenticateJWT, authorizeRole(['ADMIN']), exportReturns);
router.get('/users', authenticateJWT, authorizeRole(['ADMIN']), exportUsers);
router.get('/damaged', authenticateJWT, authorizeRole(['ADMIN']), exportDamaged);
router.get('/visits', authenticateJWT, authorizeRole(['ADMIN']), exportVisits);

export default router;
