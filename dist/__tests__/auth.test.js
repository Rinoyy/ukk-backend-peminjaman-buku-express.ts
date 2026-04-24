"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Mock prisma sebelum import apapun
jest.mock('../prisma', () => ({
    __esModule: true,
    default: {
        studentNISN: { findUnique: jest.fn() },
        user: {
            findUnique: jest.fn(),
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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = __importDefault(require("../prisma"));
const auth_controller_1 = require("../controllers/auth.controller");
// Helper untuk membuat mock req/res
const mockRes = () => {
    const res = {};
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
        const req = { body: {} };
        const res = mockRes();
        await (0, auth_controller_1.register)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('wajib') }));
    });
    test('TC-A01-02: gagal jika NISN tidak terdaftar di sekolah', async () => {
        prisma_1.default.studentNISN.findUnique.mockResolvedValue(null);
        const req = { body: { nisn: '9999999999', password: 'pass123' } };
        const res = mockRes();
        await (0, auth_controller_1.register)(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('tidak terdaftar') }));
    });
    test('TC-A01-03: gagal jika NISN sudah digunakan akun lain', async () => {
        prisma_1.default.studentNISN.findUnique.mockResolvedValue({ nisn: '1234567890' });
        prisma_1.default.user.findUnique.mockResolvedValue({ id: 1, nisn: '1234567890' });
        const req = { body: { nisn: '1234567890', password: 'pass123' } };
        const res = mockRes();
        await (0, auth_controller_1.register)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('sudah digunakan') }));
    });
    test('TC-A01-04: berhasil register dan mengembalikan data user', async () => {
        prisma_1.default.studentNISN.findUnique.mockResolvedValue({ nisn: '1234567890', name: 'Budi' });
        prisma_1.default.user.findUnique.mockResolvedValue(null);
        prisma_1.default.user.create.mockResolvedValue({ id: 1, nisn: '1234567890', role: 'SISWA' });
        prisma_1.default.user.update.mockResolvedValue({ id: 1, nisn: '1234567890', role: 'SISWA', qrCode: 'mockQR' });
        const req = { body: { nisn: '1234567890', password: 'pass123' } };
        const res = mockRes();
        await (0, auth_controller_1.register)(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Registrasi berhasil' }));
    });
});
// ============================================================
// TC-A02 – login
// ============================================================
describe('login', () => {
    afterEach(() => jest.clearAllMocks());
    test('TC-A02-01: gagal jika user tidak ditemukan', async () => {
        prisma_1.default.user.findUnique.mockResolvedValue(null);
        const req = { body: { nisn: '9999999999', password: 'wrong' } };
        const res = mockRes();
        await (0, auth_controller_1.login)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC-A02-02: gagal jika password salah', async () => {
        prisma_1.default.user.findUnique.mockResolvedValue({
            id: 1, nisn: '1234567890', password: 'hashedPassword', role: 'SISWA',
        });
        bcryptjs_1.default.compare.mockResolvedValue(false);
        const req = { body: { nisn: '1234567890', password: 'salah' } };
        const res = mockRes();
        await (0, auth_controller_1.login)(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
    test('TC-A02-03: berhasil login dan mengembalikan token', async () => {
        prisma_1.default.user.findUnique
            .mockResolvedValueOnce({ id: 1, nisn: '1234567890', password: 'hashed', role: 'SISWA', username: '1234567890' })
            .mockResolvedValueOnce({ nisn: '1234567890', name: 'Budi' });
        bcryptjs_1.default.compare.mockResolvedValue(true);
        const req = { body: { nisn: '1234567890', password: 'pass123' } };
        const res = mockRes();
        await (0, auth_controller_1.login)(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'mock.jwt.token' }));
    });
});
