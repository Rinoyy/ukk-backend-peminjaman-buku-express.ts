"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../prisma"));
const qr_1 = require("../utils/qr");
const SECRET_KEY = process.env.JWT_SECRET || 'secret';
/**
 * Mendaftarkan akun siswa baru.
 *
 * Alur:
 * 1. Validasi NISN dan password tidak kosong
 * 2. Cek NISN terdaftar di data sekolah (StudentNISN)
 * 3. Cek NISN belum dipakai akun lain
 * 4. Hash password lalu simpan user ke database
 * 5. Generate QR Code unik untuk siswa
 *
 * @route  POST /api/auth/register
 * @access Public
 * @param  req - Request body: { nisn, password }
 * @param  res - 201 user data | 400 validasi gagal | 403 NISN tidak terdaftar | 500 server error
 */
const register = async (req, res) => {
    const { nisn, password } = req.body;
    if (!nisn || !password) {
        res.status(400).json({ message: 'NISN dan password wajib diisi.' });
        return;
    }
    try {
        // Cek apakah NISN terdaftar di data sekolah
        const validNISN = await prisma_1.default.studentNISN.findUnique({ where: { nisn } });
        if (!validNISN) {
            res.status(403).json({ message: 'NISN tidak terdaftar di sistem sekolah. Hubungi admin.' });
            return;
        }
        // Cek apakah NISN sudah dipakai akun lain
        const nisnTaken = await prisma_1.default.user.findUnique({ where: { nisn } });
        if (nisnTaken) {
            res.status(400).json({ message: 'NISN sudah digunakan untuk akun lain.' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // username = nisn agar kolom non-null tetap terpenuhi
        const user = await prisma_1.default.user.create({
            data: {
                username: validNISN.name,
                nisn,
                password: hashedPassword,
                role: 'SISWA',
            },
        });
        const qrData = JSON.stringify({ id: user.id, role: user.role, nisn: user.nisn, valid: true });
        const qrCodeImage = await (0, qr_1.generateQRCode)(qrData);
        const updatedUser = await prisma_1.default.user.update({
            where: { id: user.id },
            data: { qrCode: qrCodeImage },
        });
        res.status(201).json({ message: 'Registrasi berhasil', user: updatedUser });
    }
    catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};
exports.register = register;
/**
 * Login untuk semua role (Siswa pakai NISN, Admin/Petugas pakai username).
 *
 * Mengembalikan JWT token dan data user. Token berlaku 1 jam.
 *
 * @route  POST /api/auth/login
 * @access Public
 * @param  req - Request body: { nisn?, username?, password }
 * @param  res - 200 { token, user } | 400 kredensial salah | 500 server error
 */
const login = async (req, res) => {
    const { nisn, username, password } = req.body;
    const identifier = (nisn || username || '').trim();
    try {
        // Cari user berdasarkan NISN, NIP, atau username
        const user = await prisma_1.default.user.findFirst({
            where: {
                OR: [
                    { nisn: identifier },
                    { nip: identifier },
                    { username: identifier },
                ],
            },
        });
        if (!user) {
            res.status(400).json({ message: 'NISN/username atau password salah.' });
            return;
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: 'NISN/username atau password salah.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        // Sertakan nama dari StudentNISN jika siswa
        const studentInfo = user.nisn
            ? await prisma_1.default.studentNISN.findUnique({ where: { nisn: user.nisn } })
            : null;
        res.json({ token, user: { ...user, name: studentInfo?.name ?? null } });
    }
    catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};
exports.login = login;
