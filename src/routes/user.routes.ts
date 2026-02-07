import { Router } from 'express';
import { getUsers, getUserById, deleteUser } from '../controllers/user.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// Admin Only
router.get('/', authenticateJWT, authorizeRole(['ADMIN']), getUsers);
router.get('/:id', authenticateJWT, authorizeRole(['ADMIN']), getUserById);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteUser);

export default router;
