"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const visit_controller_1 = require("../controllers/visit.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Staff (ADMIN & PETUGAS) ───────────────────────────────────
router.post('/checkin', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), visit_controller_1.checkIn);
router.post('/checkout', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), visit_controller_1.checkOut);
router.get('/', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), visit_controller_1.getVisits);
router.get('/today/count', auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'PETUGAS']), visit_controller_1.getTodayVisitsCount);
exports.default = router;
