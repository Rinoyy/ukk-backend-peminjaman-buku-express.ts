import { Router } from 'express';
import { getBookCopies, addCopy, deleteCopy, updateCopyStatus } from '../controllers/bookCopy.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Public ───────────────────────────────────────────────────
// GET /api/book-copies/:bookId — daftar semua eksemplar milik satu buku
router.get('/:bookId', authenticateJWT, getBookCopies);

// ── Admin ────────────────────────────────────────────────────
// POST   /api/book-copies           — tambah eksemplar baru ke buku (body: { bookId })
// DELETE /api/book-copies/:id       — hapus eksemplar
// PATCH  /api/book-copies/:id/status — ubah status eksemplar (body: { status })
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), addCopy);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteCopy);
router.patch('/:id/status', authenticateJWT, authorizeRole(['ADMIN']), updateCopyStatus);

export default router;
