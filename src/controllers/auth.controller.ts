import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { generateQRCode } from '../utils/qr';

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
export const register = async (req: Request, res: Response): Promise<void> => {
    const { nisn, password } = req.body;

    if (!nisn || !password) {
        res.status(400).json({ message: 'NISN/NIP dan password wajib diisi.' });
        return;
    }

    try {
        // Cek StudentNISN terlebih dahulu
        const validNISN = await prisma.studentNISN.findUnique({ where: { nisn } });

        if (validNISN) {
            // Alur SISWA
            const nisnTaken = await prisma.user.findUnique({ where: { nisn } });
            if (nisnTaken) {
                res.status(400).json({ message: 'NISN sudah digunakan untuk akun lain.' });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.user.create({
                data: { username: validNISN.name, nisn, password: hashedPassword, role: 'SISWA' },
            });

            const qrData = JSON.stringify({ id: user.id, role: user.role, nisn: user.nisn, valid: true });
            const qrCodeImage = await generateQRCode(qrData);
            const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { qrCode: qrCodeImage } });

            res.status(201).json({ message: 'Registrasi siswa berhasil', user: updatedUser });
            return;
        }

        // Tidak ada di StudentNISN — cari di StaffNIP
        const validNIP = await prisma.staffNIP.findUnique({ where: { nip: nisn } });
        if (!validNIP) {
            res.status(403).json({ message: 'NISN/NIP tidak terdaftar di sistem sekolah. Hubungi admin.' });
            return;
        }

        // Alur GURU / STAFF
        const nipTaken = await prisma.user.findUnique({ where: { nip: nisn } });
        if (nipTaken) {
            res.status(400).json({ message: 'NIP sudah digunakan untuk akun lain.' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username: validNIP.name, nip: nisn, password: hashedPassword, role: validNIP.role },
        });

        const qrData = JSON.stringify({ id: user.id, role: user.role, nip: user.nip, valid: true });
        const qrCodeImage = await generateQRCode(qrData);
        const updatedUser = await prisma.user.update({ where: { id: user.id }, data: { qrCode: qrCodeImage } });

        res.status(201).json({ message: `Registrasi ${validNIP.role.toLowerCase()} berhasil`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error });
    }
};

/**
 * Login untuk semua role (Siswa pakai NISN, Guru/Staff/Admin/Petugas pakai NIP).
 *
 * Mengembalikan JWT token dan data user. Token berlaku 1 jam.
 *
 * @route  POST /api/auth/login
 * @access Public
 * @param  req - Request body: { nisn?, nip?, password }
 * @param  res - 200 { token, user } | 400 kredensial salah | 500 server error
 */
export const login = async (req: Request, res: Response): Promise<void> => {
    const { nisn, nip, password } = req.body;
    const identifier = (nisn || nip || '').trim();

    if (!identifier || !password) {
        res.status(400).json({ message: 'NISN/NIP dan password wajib diisi.' });
        return;
    }

    try {
        // Cari user berdasarkan NISN atau NIP
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { nisn: identifier },
                    { nip: identifier },
                ],
            },
        });

        if (!user) {
            res.status(400).json({ message: 'NISN/NIP atau password salah.' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: 'NISN/NIP atau password salah.' });
            return;
        }

        const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

        // Ambil nama dari StudentNISN (siswa) atau StaffNIP (guru/staff)
        const studentInfo = user.nisn
            ? await prisma.studentNISN.findUnique({ where: { nisn: user.nisn } })
            : null;
        const staffInfo = !studentInfo && user.nip
            ? await prisma.staffNIP.findUnique({ where: { nip: user.nip } })
            : null;

        const name = studentInfo?.name ?? staffInfo?.name ?? null;

        res.json({ token, user: { ...user, name } });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
};
