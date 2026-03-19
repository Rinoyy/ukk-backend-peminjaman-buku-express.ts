import { Request, Response } from 'express';
import prisma from '../prisma';
import { generateQRCode } from '../utils/qr';

/**
 * Mengambil daftar semua buku beserta stok yang tersedia.
 * Mendukung filter pencarian berdasarkan judul/pengarang dan kategori.
 *
 * @route  GET /api/books?search=&categoryId=
 * @access Public
 * @param  req - Query: { search?, categoryId? }
 * @param  res - 200 array buku dengan field stock & totalCopies | 500 server error
 */
export const getBooks = async (req: Request, res: Response) => {
    try {
        const { search, categoryId } = req.query;
        const where: any = {};

        if (search) {
            where.OR = [
                { title: { contains: String(search) } },
                { author: { contains: String(search) } }
            ];
        }

        if (categoryId) {
            where.categoryId = Number(categoryId);
        }

        const books = await prisma.book.findMany({
            where,
            include: {
                category: true,
                copies: true // Include copies to calculate stock
            }
        });


        // Transform data to include dynamic stock count
        const booksWithStock = books.map(book => ({
            ...book,
            stock: book.copies.filter(copy => copy.status === 'AVAILABLE').length,
            totalCopies: book.copies.length
        }));

        res.json(booksWithStock);
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).json({ message: "Error fetching books", error });
    }
};

/**
 * Mengambil detail satu buku berdasarkan ID, termasuk kategori dan stok tersedia.
 *
 * @route  GET /api/books/:id
 * @access Public
 * @param  req - Params: { id }
 * @param  res - 200 data buku | 404 tidak ditemukan | 500 server error
 */
export const getBookById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const book = await prisma.book.findUnique({
            where: { id: Number(id) },
            include: {
                category: true,
                copies: true
            }
        });

        if (!book) return res.status(404).json({ message: "Book not found" });

        const bookWithStock = {
            ...book,
            stock: book.copies.filter(copy => copy.status === 'AVAILABLE').length
        };

        res.json(bookWithStock);
    } catch (error) {
        res.status(500).json({ message: "Error fetching book", error });
    }
};

/**
 * Membuat buku baru beserta sejumlah eksemplar (BookCopy).
 * Setiap eksemplar otomatis diberi QR Code unik.
 *
 * @route  POST /api/books
 * @access Admin
 * @param  req - Body: { title, author, categoryId?, stock, description? }, File: gambar cover
 * @param  res - 201 data buku lengkap | 500 server error
 */
export const createBook = async (req: Request, res: Response) => {
    const { title, author, categoryId, stock, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        // 1. Create the Book
        const book = await prisma.book.create({
            data: {
                title,
                author,
                categoryId: categoryId ? Number(categoryId) : null,
                description,
                image
            }
        });

        // 2. Create Book Copies
        const copyPromises = [];
        const quantity = Number(stock) || 1;

        for (let i = 1; i <= quantity; i++) {
            // Create copy first to get ID
            const copy = await prisma.bookCopy.create({
                data: {
                    bookId: book.id,
                    copyNumber: i,
                    status: 'AVAILABLE'
                }
            });

            // Generate Unique QR for this copy
            // Format: BOOK-{bookId}-COPY-{copyId}
            const qrData = JSON.stringify({
                type: 'BOOK_COPY',
                bookId: book.id,
                copyId: copy.id,
                title: book.title,
                copyNumber: i
            });
            const qrCode = await generateQRCode(qrData);

            // Update copy with QR
            copyPromises.push(
                prisma.bookCopy.update({
                    where: { id: copy.id },
                    data: { qrCode }
                })
            );
        }

        await Promise.all(copyPromises);

        const createdBook = await prisma.book.findUnique({
            where: { id: book.id },
            include: { copies: true, category: true }
        });

        res.status(201).json(createdBook);
    } catch (error) {
        res.status(500).json({ message: "Error creating book", error });
    }
};

/**
 * Memperbarui data buku (judul, pengarang, kategori, deskripsi, dan gambar cover).
 * Gambar hanya diperbarui jika ada file baru yang diunggah.
 *
 * @route  PUT /api/books/:id
 * @access Admin
 * @param  req - Params: { id }, Body: { title, author, categoryId?, description? }, File: gambar opsional
 * @param  res - 200 data buku terbaru | 500 server error
 */
export const updateBook = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, author, categoryId, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    try {
        const data: any = {
            title,
            author,
            categoryId: categoryId ? Number(categoryId) : null,
            description,
        };

        // Only update image if a new file was uploaded
        if (image !== undefined) {
            data.image = image;
        }

        const book = await prisma.book.update({
            where: { id: Number(id) },
            data,
            include: { category: true }
        });
        res.json(book);
    } catch (error) {
        res.status(500).json({ message: "Error updating book", error });
    }
};

/**
 * Menghapus buku dari database beserta semua eksemplarnya (cascade delete).
 *
 * @route  DELETE /api/books/:id
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 500 server error
 */
export const deleteBook = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.book.delete({ where: { id: Number(id) } });
        res.json({ message: "Book deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting book", error });
    }
};
