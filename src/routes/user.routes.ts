import { Router } from 'express';
import { getUsers, getUserById, deleteUser, createStaff, createMember } from '../controllers/user.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, authorizeRole(['ADMIN']), getUsers);
router.get('/:id', authenticateJWT, authorizeRole(['ADMIN']), getUserById);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteUser);
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), createStaff);
router.post('/members', authenticateJWT, authorizeRole(['ADMIN', 'PETUGAS']), createMember);

export default router;
