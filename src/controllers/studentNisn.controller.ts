import { Request, Response } from 'express';
import prisma from '../prisma';

export const getStudentNisns = async (_req: Request, res: Response) => {
    try {
        const list = await prisma.studentNISN.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student NISNs', error });
    }
};

export const createStudentNisn = async (req: Request, res: Response) => {
    const { nisn, name } = req.body;
    if (!nisn || !name) {
        res.status(400).json({ message: 'NISN dan nama wajib diisi.' });
        return;
    }
    try {
        const existing = await prisma.studentNISN.findUnique({ where: { nisn } });
        if (existing) {
            res.status(400).json({ message: 'NISN sudah terdaftar.' });
            return;
        }
        const record = await prisma.studentNISN.create({ data: { nisn, name } });
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error creating student NISN', error });
    }
};

export const updateStudentNisn = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nisn, name } = req.body;
    if (!nisn || !name) {
        res.status(400).json({ message: 'NISN dan nama wajib diisi.' });
        return;
    }
    try {
        const conflict = await prisma.studentNISN.findFirst({
            where: { nisn, NOT: { id: Number(id) } },
        });
        if (conflict) {
            res.status(400).json({ message: 'NISN sudah digunakan oleh data lain.' });
            return;
        }
        const record = await prisma.studentNISN.update({
            where: { id: Number(id) },
            data: { nisn, name },
        });
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error updating student NISN', error });
    }
};

export const deleteStudentNisn = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.studentNISN.delete({ where: { id: Number(id) } });
        res.json({ message: 'Data NISN berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student NISN', error });
    }
};
