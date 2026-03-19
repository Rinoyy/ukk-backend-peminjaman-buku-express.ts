import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// ── Siswa & Admin ────────────────────────────────────────────
// GET  /api/notifications          — ambil notifikasi user (maks. 50)
// POST /api/notifications/:id/read — tandai satu notifikasi sudah dibaca
// POST /api/notifications/read-all — tandai semua notifikasi sudah dibaca
router.get('/', authenticateJWT, getNotifications);
router.post('/:id/read', authenticateJWT, markAsRead);
router.post('/read-all', authenticateJWT, markAllAsRead);

export default router;
