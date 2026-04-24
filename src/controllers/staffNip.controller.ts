import { Request, Response } from 'express';
import prisma from '../prisma';

export const getStaffNips = async (_req: Request, res: Response) => {
    try {
        const list = await prisma.staffNIP.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching staff NIPs', error });
    }
};

export const createStaffNip = async (req: Request, res: Response) => {
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
        const existing = await prisma.staffNIP.findUnique({ where: { nip } });
        if (existing) {
            res.status(400).json({ message: 'NIP sudah terdaftar.' });
            return;
        }
        const record = await prisma.staffNIP.create({ data: { nip, name, role } });
        res.status(201).json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error creating staff NIP', error });
    }
};

export const updateStaffNip = async (req: Request, res: Response) => {
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
        const conflict = await prisma.staffNIP.findFirst({
            where: { nip, NOT: { id: Number(id) } },
        });
        if (conflict) {
            res.status(400).json({ message: 'NIP sudah digunakan oleh data lain.' });
            return;
        }
        const record = await prisma.staffNIP.update({
            where: { id: Number(id) },
            data: { nip, name, role },
        });
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error updating staff NIP', error });
    }
};

export const deleteStaffNip = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.staffNIP.delete({ where: { id: Number(id) } });
        res.json({ message: 'Data NIP berhasil dihapus.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting staff NIP', error });
    }
};
