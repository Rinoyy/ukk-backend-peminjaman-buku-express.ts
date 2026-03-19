import { Router } from 'express';
import {
    exportBooks,
    exportCategories,
    exportBorrowings,
    exportReturns,
    exportUsers,
    exportDamaged,
    exportVisits,
} from '../controllers/export.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Admin ────────────────────────────────────────────────────
// Semua endpoint export menghasilkan file CSV yang bisa diunduh
// GET /api/export/books      — export data buku
// GET /api/export/categories — export data kategori
// GET /api/export/borrowings — export peminjaman aktif
// GET /api/export/returns    — export riwayat pengembalian
// GET /api/export/users      — export data siswa
// GET /api/export/damaged    — export buku rusak/hilang
// GET /api/export/visits     — export data kunjungan
router.get('/books', authenticateJWT, authorizeRole(['ADMIN']), exportBooks);
router.get('/categories', authenticateJWT, authorizeRole(['ADMIN']), exportCategories);
router.get('/borrowings', authenticateJWT, authorizeRole(['ADMIN']), exportBorrowings);
router.get('/returns', authenticateJWT, authorizeRole(['ADMIN']), exportReturns);
router.get('/users', authenticateJWT, authorizeRole(['ADMIN']), exportUsers);
router.get('/damaged', authenticateJWT, authorizeRole(['ADMIN']), exportDamaged);
router.get('/visits', authenticateJWT, authorizeRole(['ADMIN']), exportVisits);

export default router;
