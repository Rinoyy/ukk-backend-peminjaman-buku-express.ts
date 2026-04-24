"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────
// GET /api/categories      — semua kategori beserta jumlah buku
// GET /api/categories/:id  — detail kategori beserta daftar buku
router.get('/', category_controller_1.getCategories);
router.get('/:id', category_controller_1.getCategoryById);
// ── Admin ────────────────────────────────────────────────────
// POST   /api/categories       — buat kategori baru (body: { name, description? })
// PUT    /api/categories/:id   — update kategori
// DELETE /api/categories/:id   — hapus kategori
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), category_controller_1.createCategory);
router.put('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), category_controller_1.updateCategory);
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), category_controller_1.deleteCategory);
exports.default = router;
