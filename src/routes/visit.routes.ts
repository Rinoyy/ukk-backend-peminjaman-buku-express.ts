import { Router } from 'express';
import { checkIn, checkOut, getVisits, getTodayVisitsCount } from '../controllers/visit.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Siswa & Admin ────────────────────────────────────────────
// POST /api/visits/checkin  — catat kunjungan siswa via scan QR (body: { userId? })
// POST /api/visits/checkout — catat waktu keluar siswa via scan QR (body: { userId? })
router.post('/checkin', authenticateJWT, checkIn);
router.post('/checkout', authenticateJWT, checkOut);

// ── Admin ────────────────────────────────────────────────────
// GET /api/visits              — semua kunjungan (support ?date=YYYY-MM-DD)
// GET /api/visits/today/count  — jumlah kunjungan hari ini
router.get('/', authenticateJWT, authorizeRole(['ADMIN']), getVisits);
router.get('/today/count', authenticateJWT, authorizeRole(['ADMIN']), getTodayVisitsCount);

export default router;
