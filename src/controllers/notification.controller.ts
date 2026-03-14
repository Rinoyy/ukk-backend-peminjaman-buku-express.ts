import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// Get notifications for logged-in user
export const getNotifications = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        await prisma.notification.updateMany({
            where: { id: Number(id), userId },
            data: { isRead: true }
        });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification', error });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notifications', error });
    }
};
