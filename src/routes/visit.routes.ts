import { Router } from 'express';
import { checkIn, getVisits, getTodayVisitsCount } from '../controllers/visit.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// Check-in endpoint (for QR scanning)
router.post('/checkin', authenticateJWT, checkIn);

// Admin only - view visits
router.get('/', authenticateJWT, authorizeRole(['ADMIN']), getVisits);
router.get('/today/count', authenticateJWT, authorizeRole(['ADMIN']), getTodayVisitsCount);

export default router;
