import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// Check-in visitor (scan QR)
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

// Get all visits (with optional date filter)
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

// Get today's visits count
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
