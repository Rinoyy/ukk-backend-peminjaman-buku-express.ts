"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const prisma_1 = __importDefault(require("../prisma"));
/**
 * Mengambil daftar notifikasi milik user yang sedang login (maks. 50 terakhir)
 * beserta jumlah notifikasi yang belum dibaca.
 *
 * @route  GET /api/notifications
 * @access Authenticated (Siswa/Admin)
 * @param  req - JWT token wajib ada di header Authorization
 * @param  res - 200 { notifications, unreadCount } | 401 unauthorized | 500 server error
 */
const getNotifications = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        const unreadCount = await prisma_1.default.notification.count({
            where: { userId, isRead: false }
        });
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error });
    }
};
exports.getNotifications = getNotifications;
/**
 * Menandai satu notifikasi sebagai sudah dibaca.
 * Hanya notifikasi milik user yang login yang bisa diubah.
 *
 * @route  PATCH /api/notifications/:id/read
 * @access Authenticated (Siswa/Admin)
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 401 unauthorized | 500 server error
 */
const markAsRead = async (req, res) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        await prisma_1.default.notification.updateMany({
            where: { id: Number(id), userId },
            data: { isRead: true }
        });
        res.json({ message: 'Marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error marking notification', error });
    }
};
exports.markAsRead = markAsRead;
/**
 * Menandai semua notifikasi milik user yang login sebagai sudah dibaca.
 *
 * @route  PATCH /api/notifications/read-all
 * @access Authenticated (Siswa/Admin)
 * @param  req - JWT token wajib ada di header Authorization
 * @param  res - 200 pesan sukses | 401 unauthorized | 500 server error
 */
const markAllAsRead = async (req, res) => {
    const userId = req.user?.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        await prisma_1.default.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error marking notifications', error });
    }
};
exports.markAllAsRead = markAllAsRead;
