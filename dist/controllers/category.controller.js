"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
const prisma_1 = __importDefault(require("../prisma"));
/**
 * Mengambil semua kategori buku beserta jumlah buku di tiap kategori.
 *
 * @route  GET /api/categories
 * @access Public
 * @param  _req - Tidak ada parameter yang dibutuhkan
 * @param  res  - 200 array kategori | 500 server error
 */
const getCategories = async (_req, res) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            include: { _count: { select: { books: true } } }
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
};
exports.getCategories = getCategories;
/**
 * Mengambil detail satu kategori beserta daftar bukunya.
 *
 * @route  GET /api/categories/:id
 * @access Public
 * @param  req - Params: { id }
 * @param  res - 200 data kategori | 404 tidak ditemukan | 500 server error
 */
const getCategoryById = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await prisma_1.default.category.findUnique({
            where: { id: Number(id) },
            include: { books: true }
        });
        if (!category) {
            res.status(404).json({ message: 'Category not found' });
            return;
        }
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching category', error });
    }
};
exports.getCategoryById = getCategoryById;
/**
 * Membuat kategori buku baru.
 *
 * @route  POST /api/categories
 * @access Admin
 * @param  req - Body: { name, description? }
 * @param  res - 201 data kategori baru | 500 server error
 */
const createCategory = async (req, res) => {
    const { name, description } = req.body;
    try {
        const category = await prisma_1.default.category.create({
            data: { name, description }
        });
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
};
exports.createCategory = createCategory;
/**
 * Memperbarui nama atau deskripsi kategori.
 *
 * @route  PUT /api/categories/:id
 * @access Admin
 * @param  req - Params: { id }, Body: { name, description? }
 * @param  res - 200 data kategori terbaru | 500 server error
 */
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const category = await prisma_1.default.category.update({
            where: { id: Number(id) },
            data: { name, description }
        });
        res.json(category);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating category', error });
    }
};
exports.updateCategory = updateCategory;
/**
 * Menghapus kategori dari database.
 * Buku yang terhubung akan kehilangan kategorinya (set null).
 *
 * @route  DELETE /api/categories/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 500 server error
 */
const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma_1.default.category.delete({ where: { id: Number(id) } });
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting category', error });
    }
};
exports.deleteCategory = deleteCategory;
