import { Request, Response } from 'express';
import prisma from '../prisma';

/**
 * Mengambil semua kategori buku beserta jumlah buku di tiap kategori.
 *
 * @route  GET /api/categories
 * @access Public
 * @param  _req - Tidak ada parameter yang dibutuhkan
 * @param  res  - 200 array kategori | 500 server error
 */
export const getCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { books: true } } }
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
};

/**
 * Mengambil detail satu kategori beserta daftar bukunya.
 *
 * @route  GET /api/categories/:id
 * @access Public
 * @param  req - Params: { id }
 * @param  res - 200 data kategori | 404 tidak ditemukan | 500 server error
 */
export const getCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const category = await prisma.category.findUnique({
            where: { id: Number(id) },
            include: { books: true }
        });
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category', error });
    }
};

/**
 * Membuat kategori buku baru.
 *
 * @route  POST /api/categories
 * @access Admin
 * @param  req - Body: { name, description? }
 * @param  res - 201 data kategori baru | 500 server error
 */
export const createCategory = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    try {
        const category = await prisma.category.create({
            data: { name, description }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
};

/**
 * Memperbarui nama atau deskripsi kategori.
 *
 * @route  PUT /api/categories/:id
 * @access Admin
 * @param  req - Params: { id }, Body: { name, description? }
 * @param  res - 200 data kategori terbaru | 500 server error
 */
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: { name, description }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error updating category', error });
    }
};

/**
 * Menghapus kategori dari database.
 * Buku yang terhubung akan kehilangan kategorinya (set null).
 *
 * @route  DELETE /api/categories/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 500 server error
 */
export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.category.delete({ where: { id: Number(id) } });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category', error });
    }
};
