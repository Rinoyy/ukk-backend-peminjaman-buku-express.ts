"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayVisitsCount = exports.checkOut = exports.getVisits = exports.checkIn = void 0;
const prisma_1 = __importDefault(require("../prisma"));
/**
 * Mencatat kunjungan siswa ke perpustakaan melalui scan QR Code.
 * UserID dapat diambil dari body request (QR scan) atau dari JWT token.
 *
 * @route  POST /api/visits/check-in
 * @access Authenticated (Admin scan QR siswa, atau siswa scan mandiri)
 * @param  req - Body: { userId? } — jika kosong, diambil dari token
 * @param  res - 201 data kunjungan | 400 user tidak valid | 500 server error
 */
const checkIn = async (req, res) => {
    const { userId } = req.body;
    // Use userId from body (QR scan) or from token
    const targetUserId = userId || req.user?.userId;
    if (!targetUserId) {
        res.status(400).json({ message: 'User ID required' });
        return;
    }
    try {
        // Check if user exists and is SISWA
        const user = await prisma_1.default.user.findUnique({ where: { id: Number(targetUserId) } });
        if (!user || user.role !== 'SISWA') {
            res.status(400).json({ message: 'Invalid user or not a Siswa' });
            return;
        }
        const visit = await prisma_1.default.visit.create({
            data: { userId: Number(targetUserId) },
            include: { user: { select: { id: true, username: true, role: true } } }
        });
        res.status(201).json({ message: 'Check-in successful', visit });
    }
    catch (error) {
        res.status(500).json({ message: 'Error checking in', error });
    }
};
exports.checkIn = checkIn;
/**
 * Mengambil semua data kunjungan, dengan filter tanggal opsional.
 *
 * @route  GET /api/visits?date=YYYY-MM-DD
 * @access Admin
 * @param  req - Query: { date? } format YYYY-MM-DD
 * @param  res - 200 array kunjungan | 500 server error
 */
const getVisits = async (req, res) => {
    const { date } = req.query; // format: YYYY-MM-DD
    try {
        let where = {};
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            where = {
                visitDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            };
        }
        const visits = await prisma_1.default.visit.findMany({
            where,
            include: { user: { select: { id: true, username: true, qrCode: true } } },
            orderBy: { visitDate: 'desc' }
        });
        res.json(visits);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching visits', error });
    }
};
exports.getVisits = getVisits;
/**
 * Mencatat waktu keluar siswa dari perpustakaan (checkout via scan QR).
 * Mencari kunjungan aktif hari ini (belum ada checkoutDate) dan mengisinya.
 *
 * @route  POST /api/visits/checkout
 * @access Authenticated (Admin scan QR siswa)
 * @param  req - Body: { userId? } — jika kosong, diambil dari token
 * @param  res - 200 data kunjungan | 400 tidak ada sesi aktif | 500 server error
 */
const checkOut = async (req, res) => {
    const { userId } = req.body;
    const targetUserId = userId || req.user?.userId;
    if (!targetUserId) {
        res.status(400).json({ message: 'User ID required' });
        return;
    }
    try {
        const user = await prisma_1.default.user.findUnique({ where: { id: Number(targetUserId) } });
        if (!user || user.role !== 'SISWA') {
            res.status(400).json({ message: 'Invalid user or not a Siswa' });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeVisit = await prisma_1.default.visit.findFirst({
            where: {
                userId: Number(targetUserId),
                checkoutDate: null,
                visitDate: { gte: today },
            },
            orderBy: { visitDate: 'desc' },
        });
        if (!activeVisit) {
            res.status(404).json({ message: 'Tidak ada sesi check-in aktif hari ini untuk siswa ini' });
            return;
        }
        const updated = await prisma_1.default.visit.update({
            where: { id: activeVisit.id },
            data: { checkoutDate: new Date() },
            include: { user: { select: { id: true, username: true, role: true } } },
        });
        res.json({ message: 'Check-out berhasil', visit: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error checking out', error });
    }
};
exports.checkOut = checkOut;
/**
 * Mengambil jumlah kunjungan hari ini.
 * Digunakan di halaman dashboard untuk menampilkan statistik harian.
 *
 * @route  GET /api/visits/today
 * @access Admin
 * @param  _req - Tidak ada parameter yang dibutuhkan
 * @param  res  - 200 { count, date } | 500 server error
 */
const getTodayVisitsCount = async (_req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const count = await prisma_1.default.visit.count({
            where: {
                visitDate: {
                    gte: today,
                    lt: tomorrow
                }
            }
        });
        res.json({ count, date: today.toISOString().split('T')[0] });
    }
    catch (error) {
        res.status(500).json({ message: 'Error counting visits', error });
    }
};
exports.getTodayVisitsCount = getTodayVisitsCount;
