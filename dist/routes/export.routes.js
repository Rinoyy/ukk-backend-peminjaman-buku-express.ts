"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const export_controller_1 = require("../controllers/export.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Admin ────────────────────────────────────────────────────
// Semua endpoint export menghasilkan file CSV yang bisa diunduh
// GET /api/export/books      — export data buku
// GET /api/export/categories — export data kategori
// GET /api/export/borrowings — export peminjaman aktif
// GET /api/export/returns    — export riwayat pengembalian
// GET /api/export/users      — export data siswa
// GET /api/export/damaged    — export buku rusak/hilang
// GET /api/export/visits     — export data kunjungan
router.get('/books', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportBooks);
router.get('/categories', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportCategories);
router.get('/borrowings', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportBorrowings);
router.get('/returns', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportReturns);
router.get('/users', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportUsers);
router.get('/damaged', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportDamaged);
router.get('/visits', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), export_controller_1.exportVisits);
exports.default = router;
