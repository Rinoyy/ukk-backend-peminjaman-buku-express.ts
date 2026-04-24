"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const borrow_controller_1 = require("../controllers/borrow.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Semua Role (ADMIN, PETUGAS, SISWA) — controller menangani filter per role ──
router.get('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS', 'SISWA']), borrow_controller_1.getBorrowings);
router.get('/fines-recap', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), borrow_controller_1.getFinesRecap);
router.post('/:id/approve', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), borrow_controller_1.handleBorrowRequest);
router.post('/:id/pickup', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), borrow_controller_1.markPickedUp);
router.post('/:id/verify-return', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), borrow_controller_1.handleReturnRequest);
router.post('/:id/pay', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), borrow_controller_1.payFine);
// ── Siswa ────────────────────────────────────────────────────
router.get('/check-eligibility', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['SISWA']), borrow_controller_1.checkEligibility);
router.get('/my-fines', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['SISWA']), borrow_controller_1.getMyFines);
router.post('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['SISWA']), borrow_controller_1.borrowBook);
router.post('/:id/cancel', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['SISWA']), borrow_controller_1.cancelBorrow);
router.post('/:id/return', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['SISWA']), borrow_controller_1.returnBookRequest);
exports.default = router;
