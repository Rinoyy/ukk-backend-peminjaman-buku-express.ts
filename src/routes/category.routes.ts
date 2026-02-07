import { Router } from 'express';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authenticateJWT, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

// Public - get categories
router.get('/', getCategories);
router.get('/:id', getCategoryById);

// Admin only - CRUD
router.post('/', authenticateJWT, authorizeRole(['ADMIN']), createCategory);
router.put('/:id', authenticateJWT, authorizeRole(['ADMIN']), updateCategory);
router.delete('/:id', authenticateJWT, authorizeRole(['ADMIN']), deleteCategory);

export default router;
