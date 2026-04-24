"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStaffNip = exports.updateStaffNip = exports.createStaffNip = exports.getStaffNips = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getStaffNips = async (_req, res) => {
    try {
        const list = await prisma_1.default.staffNIP.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching staff NIPs', error });
    }
};
exports.getStaffNips = getStaffNips;
const createStaffNip = async (req, res) => {
    const { nip, name, role } = req.body;
    if (!nip || !name || !role) {
        res.status(400).json({ message: 'NIP, nama, dan role wajib diisi.' });
        return;
    }
    if (!['GURU', 'STAFF'].includes(role)) {
        res.status(400).json({ message: 'Role harus GURU atau STAFF.' });
        return;
    }
    try {
        const existing = await prisma_1.default.staffNIP.findUnique({ where: { nip } });
        if (existing) {
            res.status(400).json({ message: 'NIP sudah terdaftar.' });
            return;
        }
        const record = await prisma_1.default.staffNIP.create({ data: { nip, name, role } });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating staff NIP', error });
    }
};
exports.createStaffNip = createStaffNip;
const updateStaffNip = async (req, res) => {
    const { id } = req.params;
    const { nip, name, role } = req.body;
    if (!nip || !name || !role) {
        res.status(400).json({ message: 'NIP, nama, dan role wajib diisi.' });
        return;
    }
    if (!['GURU', 'STAFF'].includes(role)) {
        res.status(400).json({ message: 'Role harus GURU atau STAFF.' });
        return;
    }
    try {
        const conflict = await prisma_1.default.staffNIP.findFirst({
            where: { nip, NOT: { id: Number(id) } },
        });
        if (conflict) {
            res.status(400).json({ message: 'NIP sudah digunakan oleh data lain.' });
            return;
        }
        const record = await prisma_1.default.staffNIP.update({
            where: { id: Number(id) },
            data: { nip, name, role },
        });
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating staff NIP', error });
    }
};
exports.updateStaffNip = updateStaffNip;
const deleteStaffNip = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.staffNIP.delete({ where: { id: Number(id) } });
        res.json({ message: 'Data NIP berhasil dihapus.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting staff NIP', error });
    }
};
exports.deleteStaffNip = deleteStaffNip;
