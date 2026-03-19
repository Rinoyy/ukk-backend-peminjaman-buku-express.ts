import { Router } from 'express';
import { getUsers, getUserById, deleteUser } from '../controllers/user.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Admin ────────────────────────────────────────────────────
// GET    /api/users      — daftar semua user
// GET    /api/users/:id  — detail user beserta QR Code
// DELETE /api/users/:id  — hapus user
router.get('/', authenticateJWT, authorizeRole(['ADMIN']), getUsers);
router.get('/:id', authenticateJWT, authorizeRole(['ADMIN']), getUserById);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteUser);

export default router;
