import { Router } from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/book.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';
import { uploadImage } from '../config/multer';

const router = Router();

// ── Public ──────────────────────────────────────────────────
// GET /api/books          — daftar semua buku (support ?search= & ?categoryId=)
// GET /api/books/:id      — detail buku beserta stok eksemplar
router.get('/', authenticateJWT, getBooks);
router.get('/:id', authenticateJWT, getBookById);

// ── Admin ────────────────────────────────────────────────────
// POST   /api/books        — tambah buku baru + generate QR tiap eksemplar
// PUT    /api/books/:id    — update data buku
// DELETE /api/books/:id    — hapus buku (cascade ke BookCopy)
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), uploadImage.single('image'), createBook);
router.put('/:id', authenticateJWT, authorizeRole(['ADMIN']), uploadImage.single('image'), updateBook);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteBook);

export default router;
