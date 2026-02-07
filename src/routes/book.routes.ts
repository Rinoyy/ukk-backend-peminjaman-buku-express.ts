import { Router } from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/book.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getBooks);
router.get('/:id', authenticateJWT, getBookById);

// Admin Only
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), createBook);
router.put('/:id', authenticateJWT, authorizeRole(['ADMIN']), updateBook);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteBook);

export default router;
