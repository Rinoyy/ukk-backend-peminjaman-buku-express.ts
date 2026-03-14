import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getNotifications);
router.post('/:id/read', authenticateJWT, markAsRead);
router.post('/read-all', authenticateJWT, markAllAsRead);

export default router;
