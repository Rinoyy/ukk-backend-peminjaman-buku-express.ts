"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookCopy_controller_1 = require("../controllers/bookCopy.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Public ───────────────────────────────────────────────────
// GET /api/book-copies/:bookId — daftar semua eksemplar milik satu buku
router.get('/:bookId', auth_middleware_1.authenticateJWT, bookCopy_controller_1.getBookCopies);
// ── Admin ────────────────────────────────────────────────────
// POST   /api/book-copies           — tambah eksemplar baru ke buku (body: { bookId })
// DELETE /api/book-copies/:id       — hapus eksemplar
// PATCH  /api/book-copies/:id/status — ubah status eksemplar (body: { status })
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), bookCopy_controller_1.addCopy);
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), bookCopy_controller_1.deleteCopy);
router.patch('/:id/status', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), bookCopy_controller_1.updateCopyStatus);
exports.default = router;
