import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../types';

/**
 * Mencatat kunjungan siswa ke perpustakaan melalui scan QR Code.
 * UserID dapat diambil dari body request (QR scan) atau dari JWT token.
 *
 * @route  POST /api/visits/check-in
 * @access Authenticated (Admin scan QR siswa, atau siswa scan mandiri)
 * @param  req - Body: { userId? } — jika kosong, diambil dari token
 * @param  res - 201 data kunjungan | 400 user tidak valid | 500 server error
 */
export const checkIn = async (req: AuthRequest, res: Response) => {
    const { userId } = req.body;

    // Use userId from body (QR scan) or from token
    const targetUserId = userId || req.user?.userId;

    if (!targetUserId) {
        res.status(400).json({ message: 'User ID required' });
        return;
    }

    try {
        // Check if user exists and is SISWA
        const user = await prisma.user.findUnique({ where: { id: Number(targetUserId) } });
        if (!user || user.role !== 'SISWA') {
            res.status(400).json({ message: 'Invalid user or not a Siswa' });
            return;
        }

        const visit = await prisma.visit.create({
            data: { userId: Number(targetUserId) },
            include: { user: { select: { id: true, username: true, role: true } } }
        });

        res.status(201).json({ message: 'Check-in successful', visit });
    } catch (error) {
        res.status(500).json({ message: 'Error checking in', error });
    }
};

/**
 * Mengambil semua data kunjungan, dengan filter tanggal opsional.
 *
 * @route  GET /api/visits?date=YYYY-MM-DD
 * @access Admin
 * @param  req - Query: { date? } format YYYY-MM-DD
 * @param  res - 200 array kunjungan | 500 server error
 */
export const getVisits = async (req: Request, res: Response) => {
    const { date } = req.query; // format: YYYY-MM-DD

    try {
        let where = {};

        if (date) {
            const startOfDay = new Date(date as string);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date as string);
            endOfDay.setHours(23, 59, 59, 999);

            where = {
                visitDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };
        }

        const visits = await prisma.visit.findMany({
            where,
            include: { user: { select: { id: true, username: true, qrCode: true } } },
            orderBy: { visitDate: 'desc' }
        });

        res.json(visits);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching visits', error });
    }
};

/**
 * Mengambil jumlah kunjungan hari ini.
 * Digunakan di halaman dashboard untuk menampilkan statistik harian.
 *
 * @route  GET /api/visits/today
 * @access Admin
 * @param  _req - Tidak ada parameter yang dibutuhkan
 * @param  res  - 200 { count, date } | 500 server error
 */
export const getTodayVisitsCount = async (_req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const count = await prisma.visit.count({
            where: {
                visitDate: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });

        res.json({ count, date: today.toISOString().split('T')[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error counting visits', error });
    }
};
