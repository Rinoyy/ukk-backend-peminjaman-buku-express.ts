import { Router } from 'express';
import { getBookCopies, addCopy, deleteCopy, updateCopyStatus } from '../controllers/bookCopy.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:bookId', authenticateJWT, getBookCopies);
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), addCopy);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteCopy);
router.patch('/:id/status', authenticateJWT, authorizeRole(['ADMIN']), updateCopyStatus);

export default router;
