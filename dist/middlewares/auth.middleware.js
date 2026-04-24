"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticateJWT = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET_KEY = process.env.JWT_SECRET || 'secret';
/**
 * Middleware autentikasi JWT.
 * Membaca token dari header `Authorization: Bearer <token>`,
 * memverifikasi, lalu menyisipkan data user ke `req.user`.
 *
 * @param  req  - AuthRequest dengan header Authorization
 * @param  res  - 401 jika token tidak ada/expired | 403 jika token tidak valid
 * @param  next - Lanjut ke handler berikutnya jika token valid
 */
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        jsonwebtoken_1.default.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'Token expired, silakan login ulang' });
                }
                return res.status(403).json({ message: 'Token tidak valid' });
            }
            req.user = {
                userId: decoded.id,
                role: decoded.role
            };
            next();
        });
    }
    else {
        res.sendStatus(401);
    }
};
exports.authenticateJWT = authenticateJWT;
/**
 * Middleware otorisasi berbasis role.
 * Memastikan user yang sudah login memiliki role yang diizinkan.
 *
 * @param  roles - Array role yang diperbolehkan, contoh: ['ADMIN', 'PETUGAS']
 * @returns Middleware function yang mengembalikan 401/403 jika role tidak sesuai
 *
 * @example
 * router.get('/admin-only', authenticateJWT, authorizeRole(['ADMIN']), handler);
 */
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.sendStatus(401);
        }
        if (roles.includes(req.user.role)) {
            next();
        }
        else {
            res.sendStatus(403);
        }
    };
};
exports.authorizeRole = authorizeRole;
