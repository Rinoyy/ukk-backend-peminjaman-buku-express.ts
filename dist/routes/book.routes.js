"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const book_controller_1 = require("../controllers/book.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
// ── Public ──────────────────────────────────────────────────
// GET /api/books          — daftar semua buku (support ?search= & ?categoryId=)
// GET /api/books/:id      — detail buku beserta stok eksemplar
router.get('/', auth_middleware_1.authenticateJWT, book_controller_1.getBooks);
router.get('/:id', auth_middleware_1.authenticateJWT, book_controller_1.getBookById);
// ── Admin ────────────────────────────────────────────────────
// POST   /api/books        — tambah buku baru + generate QR tiap eksemplar
// PUT    /api/books/:id    — update data buku
// DELETE /api/books/:id    — hapus buku (cascade ke BookCopy)
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), multer_1.uploadImage.single('image'), book_controller_1.createBook);
router.put('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), multer_1.uploadImage.single('image'), book_controller_1.updateBook);
router.delete('/:id', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN']), book_controller_1.deleteBook);
exports.default = router;
