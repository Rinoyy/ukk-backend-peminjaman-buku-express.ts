"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMember = exports.createStaff = exports.deleteUser = exports.getUserById = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const qr_1 = require("../utils/qr");
/**
 * Mengambil daftar semua pengguna (tanpa password dan QR Code).
 * Menampilkan id, username, role, dan tanggal dibuat.
 *
 * @route  GET /api/users
 * @access Admin
 * @param  req - Tidak ada parameter tambahan
 * @param  res - 200 array user | 500 server error
 */
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({ select: { id: true, username: true, role: true, createdAt: true } });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
};
exports.getUsers = getUsers;
/**
 * Mengambil detail satu user berdasarkan ID, termasuk QR Code siswa.
 *
 * @route  GET /api/users/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 data user | 404 tidak ditemukan | 500 server error
 */
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: Number(id) },
            select: { id: true, username: true, role: true, createdAt: true, qrCode: true }
        });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user", error });
    }
};
exports.getUserById = getUserById;
/**
 * Menghapus user dari database. Hanya bisa dilakukan oleh Admin.
 * Data peminjaman yang terhubung akan ikut terpengaruh (relasi).
 *
 * @route  DELETE /api/users/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 500 server error
 */
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.user.delete({ where: { id: Number(id) } });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting user", error });
    }
};
exports.deleteUser = deleteUser;
const createStaff = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ message: 'Username dan password wajib diisi.' });
        return;
    }
    try {
        const existing = await prisma_1.default.user.findUnique({ where: { username } });
        if (existing) {
            res.status(400).json({ message: 'Username sudah digunakan.' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: { username, password: hashedPassword, role: 'PETUGAS' },
            select: { id: true, username: true, role: true, createdAt: true },
        });
        res.status(201).json({ message: 'Akun petugas berhasil dibuat', user });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating staff', error });
    }
};
exports.createStaff = createStaff;
const createMember = async (req, res) => {
    const { nip, password } = req.body;
    if (!nip || !password) {
        res.status(400).json({ message: 'NIP dan password wajib diisi.' });
        return;
    }
    try {
        // Validasi NIP terdaftar di whitelist
        const validNIP = await prisma_1.default.staffNIP.findUnique({ where: { nip } });
        if (!validNIP) {
            res.status(403).json({ message: 'NIP tidak terdaftar di sistem. Hubungi admin.' });
            return;
        }
        // Cek NIP belum dipakai akun lain
        const nipTaken = await prisma_1.default.user.findUnique({ where: { nip } });
        if (nipTaken) {
            res.status(400).json({ message: 'NIP sudah digunakan untuk akun lain.' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: { username: validNIP.name, nip, password: hashedPassword, role: validNIP.role },
        });
        const qrData = JSON.stringify({ id: user.id, role: user.role, nip: user.nip, valid: true });
        const qrCode = await (0, qr_1.generateQRCode)(qrData);
        const updated = await prisma_1.default.user.update({
            where: { id: user.id },
            data: { qrCode },
            select: { id: true, username: true, nip: true, role: true, qrCode: true, createdAt: true },
        });
        res.status(201).json({ message: `Akun ${validNIP.role.toLowerCase()} berhasil dibuat`, user: updated });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating member', error });
    }
};
exports.createMember = createMember;
