import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

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
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'Token expired, silakan login ulang' });
                }
                return res.status(403).json({ message: 'Token tidak valid' });
            }
            req.user = {
                userId: (decoded as any).id,
                role: (decoded as any).role
            };
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

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
export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.sendStatus(401);
        }

        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.sendStatus(403);
        }
    };
};
