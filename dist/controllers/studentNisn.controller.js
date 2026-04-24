"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudentNisn = exports.updateStudentNisn = exports.createStudentNisn = exports.getStudentNisns = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const getStudentNisns = async (_req, res) => {
    try {
        const list = await prisma_1.default.studentNISN.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching student NISNs', error });
    }
};
exports.getStudentNisns = getStudentNisns;
const createStudentNisn = async (req, res) => {
    const { nisn, name } = req.body;
    if (!nisn || !name) {
        res.status(400).json({ message: 'NISN dan nama wajib diisi.' });
        return;
    }
    try {
        const existing = await prisma_1.default.studentNISN.findUnique({ where: { nisn } });
        if (existing) {
            res.status(400).json({ message: 'NISN sudah terdaftar.' });
            return;
        }
        const record = await prisma_1.default.studentNISN.create({ data: { nisn, name } });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating student NISN', error });
    }
};
exports.createStudentNisn = createStudentNisn;
const updateStudentNisn = async (req, res) => {
    const { id } = req.params;
    const { nisn, name } = req.body;
    if (!nisn || !name) {
        res.status(400).json({ message: 'NISN dan nama wajib diisi.' });
        return;
    }
    try {
        const conflict = await prisma_1.default.studentNISN.findFirst({
            where: { nisn, NOT: { id: Number(id) } },
        });
        if (conflict) {
            res.status(400).json({ message: 'NISN sudah digunakan oleh data lain.' });
            return;
        }
        const record = await prisma_1.default.studentNISN.update({
            where: { id: Number(id) },
            data: { nisn, name },
        });
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating student NISN', error });
    }
};
exports.updateStudentNisn = updateStudentNisn;
const deleteStudentNisn = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.studentNISN.delete({ where: { id: Number(id) } });
        res.json({ message: 'Data NISN berhasil dihapus.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting student NISN', error });
    }
};
exports.deleteStudentNisn = deleteStudentNisn;
