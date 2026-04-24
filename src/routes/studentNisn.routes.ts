import { Router } from 'express';
import { getStudentNisns, createStudentNisn, updateStudentNisn, deleteStudentNisn } from '../controllers/studentNisn.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

const allowed = ['ADMIN', 'PETUGAS'];

router.get('/',     authenticateJWT, authorizeRole(allowed), getStudentNisns);
router.post('/',    authenticateJWT, authorizeRole(allowed), createStudentNisn);
router.put('/:id',  authenticateJWT, authorizeRole(allowed), updateStudentNisn);
router.delete('/:id', authenticateJWT, authorizeRole(allowed), deleteStudentNisn);

export default router;
