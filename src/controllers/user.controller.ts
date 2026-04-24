import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { generateQRCode } from '../utils/qr';

/**
 * Mengambil daftar semua pengguna (tanpa password dan QR Code).
 * Menampilkan id, username, role, dan tanggal dibuat.
 *
 * @route  GET /api/users
 * @access Admin
 * @param  req - Tidak ada parameter tambahan
 * @param  res - 200 array user | 500 server error
 */
export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({ select: { id: true, username: true, role: true, createdAt: true } });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error });
    }
};

/**
 * Mengambil detail satu user berdasarkan ID, termasuk QR Code siswa.
 *
 * @route  GET /api/users/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 data user | 404 tidak ditemukan | 500 server error
 */
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: { id: true, username: true, role: true, createdAt: true, qrCode: true }
        });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error });
    }
};

/**
 * Menghapus user dari database. Hanya bisa dilakukan oleh Admin.
 * Data peminjaman yang terhubung akan ikut terpengaruh (relasi).
 *
 * @route  DELETE /api/users/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 500 server error
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id: Number(id) } });
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error });
    }
};

export const createStaff = async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        res.status(400).json({ message: 'Username dan password wajib diisi.' });
        return;
    }
    try {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            res.status(400).json({ message: 'Username sudah digunakan.' });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, role: 'PETUGAS' },
            select: { id: true, username: true, role: true, createdAt: true },
        });
        res.status(201).json({ message: 'Akun petugas berhasil dibuat', user });
    } catch (error) {
        res.status(500).json({ message: 'Error creating staff', error });
    }
};

export const createMember = async (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        res.status(400).json({ message: 'Username, password, dan role wajib diisi.' });
        return;
    }
    if (!['GURU', 'STAFF'].includes(role)) {
        res.status(400).json({ message: 'Role harus GURU atau STAFF.' });
        return;
    }
    try {
        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            res.status(400).json({ message: 'Username sudah digunakan.' });
            return;
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, role },
        });

        const qrData = JSON.stringify({ id: user.id, role: user.role, username: user.username, valid: true });
        const qrCode = await generateQRCode(qrData);

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { qrCode },
            select: { id: true, username: true, role: true, qrCode: true, createdAt: true },
        });

        res.status(201).json({ message: `Akun ${role.toLowerCase()} berhasil dibuat`, user: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error creating member', error });
    }
};
