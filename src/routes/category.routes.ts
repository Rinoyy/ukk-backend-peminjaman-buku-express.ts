import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// ── Public ───────────────────────────────────────────────────
// GET /api/categories      — semua kategori beserta jumlah buku
// GET /api/categories/:id  — detail kategori beserta daftar buku
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// ── Admin ────────────────────────────────────────────────────
// POST   /api/categories       — buat kategori baru (body: { name, description? })
// PUT    /api/categories/:id   — update kategori
// DELETE /api/categories/:id   — hapus kategori
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), createCategory);
router.put('/:id', authenticateJWT, authorizeRole(['ADMIN']), updateCategory);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteCategory);

export default router;
