import { Router } from 'express';
import { checkIn, checkOut, getVisits, getTodayVisitsCount } from '../controllers/visit.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Staff (ADMIN & PETUGAS) ───────────────────────────────────
router.post('/checkin', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), checkIn);
router.post('/checkout', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), checkOut);
router.get('/', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), getVisits);
router.get('/today/count', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), getTodayVisitsCount);

export default router;
