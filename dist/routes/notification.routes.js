"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// ── Siswa & Admin ────────────────────────────────────────────
// GET  /api/notifications          — ambil notifikasi user (maks. 50)
// POST /api/notifications/:id/read — tandai satu notifikasi sudah dibaca
// POST /api/notifications/read-all — tandai semua notifikasi sudah dibaca
router.get('/', auth_middleware_1.authenticateJWT, notification_controller_1.getNotifications);
router.post('/:id/read', auth_middleware_1.authenticateJWT, notification_controller_1.markAsRead);
router.post('/read-all', auth_middleware_1.authenticateJWT, notification_controller_1.markAllAsRead);
exports.default = router;
