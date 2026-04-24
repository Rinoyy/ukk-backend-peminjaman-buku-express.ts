"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// POST /api/auth/register — daftar akun siswa baru
router.post('/register', auth_controller_1.register);
// POST /api/auth/login — login semua role
router.post('/login', auth_controller_1.login);
exports.default = router;
