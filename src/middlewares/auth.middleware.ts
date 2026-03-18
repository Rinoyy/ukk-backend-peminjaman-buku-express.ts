import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'secret';

/* Extend Express Request to include user info */
export interface AuthRequest extends Request {
    user?: {
        userId: number;
        role: string;
    };
}

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
