import { Request, Response } from 'express';
import prisma from '../prisma';

// Helper: escape CSV field
const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Helper: convert array of objects to CSV string
const toCSV = (headers: string[], rows: string[][]): string => {
    const headerLine = headers.map(escapeCSV).join(',');
    const dataLines = rows.map(row => row.map(escapeCSV).join(','));
    return [headerLine, ...dataLines].join('\n');
};

// Helper: send CSV response
const sendCSV = (res: Response, filename: string, csv: string) => {
    // Add BOM for proper UTF-8 encoding in Excel
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(bom + csv);
};

// 1. Export Books
export const exportBooks = async (_req: Request, res: Response) => {
    try {
        const books = await prisma.book.findMany({
            include: {
                category: true,
                copies: true
            },
            orderBy: { id: 'asc' }
        });

        const headers = ['ID', 'Judul', 'Penulis', 'Kategori', 'Deskripsi', 'Total Copy', 'Tersedia', 'Dipinjam', 'Reservasi', 'Rusak', 'Hilang', 'Dibuat'];
        const rows = books.map(book => [
            String(book.id),
            book.title,
            book.author,
            book.category?.name || '-',
            book.description || '-',
            String(book.copies.length),
            String(book.copies.filter(c => c.status === 'AVAILABLE').length),
            String(book.copies.filter(c => c.status === 'BORROWED').length),
            String(book.copies.filter(c => c.status === 'RESERVED').length),
            String(book.copies.filter(c => c.status === 'DAMAGED').length),
            String(book.copies.filter(c => c.status === 'LOST').length),
            book.createdAt.toISOString().split('T')[0]
        ]);

        sendCSV(res, 'data-buku.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting books', error });
    }
};

// 2. Export Categories
export const exportCategories = async (_req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            include: { _count: { select: { books: true } } },
            orderBy: { id: 'asc' }
        });

        const headers = ['ID', 'Nama Kategori', 'Deskripsi', 'Jumlah Buku', 'Dibuat'];
        const rows = categories.map(cat => [
            String(cat.id),
            cat.name,
            cat.description || '-',
            String(cat._count.books),
            cat.createdAt.toISOString().split('T')[0]
        ]);

        sendCSV(res, 'data-kategori.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting categories', error });
    }
};

// 3. Export Borrowings (peminjaman aktif/pending)
export const exportBorrowings = async (_req: Request, res: Response) => {
    try {
        const borrowings = await prisma.borrowing.findMany({
            where: {
                status: { in: ['PENDING', 'BORROWED', 'RETURN_PENDING'] }
            },
            include: {
                user: { select: { username: true } },
                bookCopy: {
                    include: { book: { select: { title: true, author: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const headers = ['ID', 'Siswa', 'Judul Buku', 'Penulis', 'Copy No', 'Status', 'Tanggal Pinjam', 'Jatuh Tempo', 'Dibuat'];
        const rows = borrowings.map(b => [
            String(b.id),
            b.user.username,
            b.bookCopy.book.title,
            b.bookCopy.book.author,
            String(b.bookCopy.copyNumber),
            b.status,
            b.borrowDate ? b.borrowDate.toISOString().split('T')[0] : '-',
            b.dueDate ? b.dueDate.toISOString().split('T')[0] : '-',
            b.createdAt.toISOString().split('T')[0]
        ]);

        sendCSV(res, 'data-peminjaman.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting borrowings', error });
    }
};

// 4. Export Returns (pengembalian)
export const exportReturns = async (_req: Request, res: Response) => {
    try {
        const returns = await prisma.borrowing.findMany({
            where: { status: 'RETURNED' },
            include: {
                user: { select: { username: true } },
                bookCopy: {
                    include: { book: { select: { title: true, author: true } } }
                }
            },
            orderBy: { actualReturnDate: 'desc' }
        });

        const headers = ['ID', 'Siswa', 'Judul Buku', 'Penulis', 'Copy No', 'Tanggal Pinjam', 'Jatuh Tempo', 'Tanggal Kembali', 'Kondisi', 'Denda Terlambat', 'Denda Kerusakan', 'Total Denda', 'Lunas'];
        const rows = returns.map(b => [
            String(b.id),
            b.user.username,
            b.bookCopy.book.title,
            b.bookCopy.book.author,
            String(b.bookCopy.copyNumber),
            b.borrowDate ? b.borrowDate.toISOString().split('T')[0] : '-',
            b.dueDate ? b.dueDate.toISOString().split('T')[0] : '-',
            b.actualReturnDate ? b.actualReturnDate.toISOString().split('T')[0] : '-',
            b.condition || '-',
            String(b.lateFee),
            String(b.damageFee),
            String(b.totalFine),
            b.isPaid ? 'Ya' : 'Belum'
        ]);

        sendCSV(res, 'data-pengembalian.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting returns', error });
    }
};

// 5. Export Users
export const exportUsers = async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                _count: {
                    select: { borrowings: true, visits: true }
                }
            },
            orderBy: { id: 'asc' }
        });

        const headers = ['ID', 'Username', 'Role', 'Total Peminjaman', 'Total Kunjungan', 'Terdaftar'];
        const rows = users.map(u => [
            String(u.id),
            u.username,
            u.role,
            String(u._count.borrowings),
            String(u._count.visits),
            u.createdAt.toISOString().split('T')[0]
        ]);

        sendCSV(res, 'data-pengguna.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting users', error });
    }
};

// 6. Export Damaged/Lost Items
export const exportDamaged = async (_req: Request, res: Response) => {
    try {
        const damaged = await prisma.bookCopy.findMany({
            where: { status: { in: ['DAMAGED', 'LOST'] } },
            include: {
                book: { select: { title: true, author: true } },
                borrowings: {
                    where: { condition: { in: ['DAMAGED', 'LOST'] } },
                    include: {
                        user: { select: { username: true } }
                    },
                    orderBy: { actualReturnDate: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const headers = ['ID Copy', 'Judul Buku', 'Penulis', 'Copy No', 'Status', 'Peminjam Terakhir', 'Tanggal', 'Denda Kerusakan'];
        const rows = damaged.map(d => {
            const lastBorrow = d.borrowings[0];
            return [
                String(d.id),
                d.book.title,
                d.book.author,
                String(d.copyNumber),
                d.status,
                lastBorrow?.user?.username || '-',
                lastBorrow?.actualReturnDate ? lastBorrow.actualReturnDate.toISOString().split('T')[0] : '-',
                lastBorrow ? String(lastBorrow.damageFee) : '0'
            ];
        });

        sendCSV(res, 'data-barang-rusak-hilang.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting damaged items', error });
    }
};

// 7. Export Visits
export const exportVisits = async (_req: Request, res: Response) => {
    try {
        const visits = await prisma.visit.findMany({
            include: {
                user: { select: { id: true, username: true } }
            },
            orderBy: { visitDate: 'desc' }
        });

        const headers = ['ID', 'ID Siswa', 'Username Siswa', 'Tanggal Kunjungan', 'Waktu'];
        const rows = visits.map(v => [
            String(v.id),
            String(v.user.id),
            v.user.username,
            v.visitDate.toISOString().split('T')[0],
            v.visitDate.toISOString().split('T')[1]?.split('.')[0] || '-'
        ]);

        sendCSV(res, 'data-kunjungan.csv', toCSV(headers, rows));
    } catch (error) {
        res.status(500).json({ message: 'Error exporting visits', error });
    }
};
