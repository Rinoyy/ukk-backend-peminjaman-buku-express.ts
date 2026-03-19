import { Request } from 'express';

/**
 * Ekstensi interface Request dari Express untuk menyertakan data user dari JWT.
 * Digunakan di semua route yang membutuhkan autentikasi.
 */
export interface AuthRequest extends Request {
    /** Data user yang didekode dari JWT token */
    user?: {
        /** ID user dari database */
        userId: number;
        /** Role user: 'ADMIN', 'SISWA', atau 'PETUGAS' */
        role: string;
    };
}
