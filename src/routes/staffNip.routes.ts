import { Router } from 'express';
import { getStaffNips, createStaffNip, updateStaffNip, deleteStaffNip } from '../controllers/staffNip.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

const allowed = ['ADMIN', 'PETUGAS'];

router.get('/',      authenticateJWT, authorizeRole(allowed), getStaffNips);
router.post('/',     authenticateJWT, authorizeRole(allowed), createStaffNip);
router.put('/:id',   authenticateJWT, authorizeRole(allowed), updateStaffNip);
router.delete('/:id', authenticateJWT, authorizeRole(allowed), deleteStaffNip);

export default router;
