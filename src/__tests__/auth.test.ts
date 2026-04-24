// Mock prisma sebelum import apapun
jest.mock('../prisma', () => ({
    __esModule: true,
    default: {
        studentNISN: { findUnique: jest.fn() },
        staffNIP: { findUnique: jest.fn() },
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('../utils/qr', () => ({
    generateQRCode: jest.fn().mockResolvedValue('data:image/png;base64,mockQR'),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashedPassword123'),
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
}));

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { register, login } from '../controllers/auth.controller';

// Helper untuk membuat mock req/res
const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// ============================================================
// TC-A01 – register
// ============================================================
describe('register', () => {
    afterEach(() => jest.clearAllMocks());

    test('TC-A01-01: gagal jika NISN atau password tidak dikirim', async () => {
        const req = { body: {} } as Request;
        const res = mockRes();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('wajib') })
        );
    });

    test('TC-A01-02: gagal jika NISN tidak terdaftar di sekolah', async () => {
        (prisma.studentNISN.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.staffNIP.findUnique as jest.Mock).mockResolvedValue(null);

        const req = { body: { nisn: '9999999999', password: 'pass123' } } as Request;
        const res = mockRes();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('tidak terdaftar') })
        );
    });

    test('TC-A01-03: gagal jika NISN sudah digunakan akun lain', async () => {
        (prisma.studentNISN.findUnique as jest.Mock).mockResolvedValue({ nisn: '1234567890' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, nisn: '1234567890' });

        const req = { body: { nisn: '1234567890', password: 'pass123' } } as Request;
        const res = mockRes();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('sudah digunakan') })
        );
    });

    test('TC-A01-04: berhasil register dan mengembalikan data user', async () => {
        (prisma.studentNISN.findUnique as jest.Mock).mockResolvedValue({ nisn: '1234567890', name: 'Budi' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1, nisn: '1234567890', role: 'SISWA' });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 1, nisn: '1234567890', role: 'SISWA', qrCode: 'mockQR' });

        const req = { body: { nisn: '1234567890', password: 'pass123' } } as Request;
        const res = mockRes();

        await register(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Registrasi siswa berhasil' })
        );
    });
});

// ============================================================
// TC-A02 – login
// ============================================================
describe('login', () => {
    afterEach(() => jest.clearAllMocks());

    test('TC-A02-01: gagal jika identifier atau password tidak dikirim', async () => {
        const req = { body: {} } as Request;
        const res = mockRes();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-A02-02: gagal jika user tidak ditemukan', async () => {
        (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

        const req = { body: { nisn: '9999999999', password: 'wrong' } } as Request;
        const res = mockRes();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-A02-03: gagal jika password salah', async () => {
        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            id: 1, nisn: '1234567890', password: 'hashedPassword', role: 'SISWA',
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const req = { body: { nisn: '1234567890', password: 'salah' } } as Request;
        const res = mockRes();

        await login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('TC-A02-04: berhasil login pakai NISN dan mengembalikan token', async () => {
        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            id: 1, nisn: '1234567890', password: 'hashed', role: 'SISWA', username: 'budi',
        });
        (prisma.studentNISN.findUnique as jest.Mock).mockResolvedValue({ nisn: '1234567890', name: 'Budi' });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const req = { body: { nisn: '1234567890', password: 'pass123' } } as Request;
        const res = mockRes();

        await login(req, res);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ token: 'mock.jwt.token' })
        );
    });

    test('TC-A02-05: admin/petugas bisa login pakai username', async () => {
        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            id: 99, username: 'admin', password: 'hashed', role: 'ADMIN',
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const req = { body: { username: 'admin', password: 'pass123' } } as Request;
        const res = mockRes();

        await login(req, res);

        expect(prisma.user.findFirst).toHaveBeenCalledWith({
            where: {
                OR: [
                    { nisn: 'admin' },
                    { nip: 'admin' },
                    { username: 'admin' },
                ],
            },
        });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ token: 'mock.jwt.token' })
        );
    });
});
