import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../types';

/** Denda keterlambatan per hari dalam Rupiah */
const LATE_FEE_PER_DAY = 1000;
/** Durasi pinjam standar dalam hari */
const LOAN_DURATION_DAYS = 7;

/**
 * Menghitung denda keterlambatan pengembalian buku (internal).
 * @param dueDate    - Tanggal jatuh tempo
 * @param returnDate - Tanggal aktual pengembalian
 * @returns Total denda dalam Rupiah (0 jika tidak terlambat)
 */
const calculateLateFee = (dueDate: Date, returnDate: Date): number => {
    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * LATE_FEE_PER_DAY : 0;
};

/**
 * Mengecek apakah siswa bisa melakukan peminjaman buku baru.
 * Siswa tidak bisa meminjam jika masih ada buku belum dikembalikan atau ada denda belum dibayar.
 *
 * @route  GET /api/borrow/eligibility
 * @access Siswa
 * @param  req - JWT token wajib ada
 * @param  res - 200 { canBorrow, reason, hasUnreturnedBook, hasUnpaidFine, unpaidFineAmount }
 */
export const checkEligibility = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        // Check for unreturned books
        const unreturnedBook = await prisma.borrowing.findFirst({
            where: {
                userId,
                status: { in: ['BORROWED', 'RETURN_PENDING'] }
            },
            include: {
                bookCopy: {
                    include: { book: { select: { title: true } } }
                }
            }
        });

        // Check for unpaid fines
        const unpaidFine = await prisma.borrowing.findFirst({
            where: {
                userId,
                totalFine: { gt: 0 },
                isPaid: false,
                status: 'RETURNED'
            },
            include: {
                bookCopy: {
                    include: { book: { select: { title: true } } }
                }
            }
        });

        const canBorrow = !unreturnedBook && !unpaidFine;
        let reason = null;

        if (unreturnedBook) {
            reason = `Anda masih memiliki buku "${unreturnedBook.bookCopy.book.title}" yang belum dikembalikan`;
        } else if (unpaidFine) {
            reason = `Anda memiliki denda Rp ${unpaidFine.totalFine.toLocaleString('id-ID')} yang belum dibayar`;
        }

        res.json({
            canBorrow,
            reason,
            hasUnreturnedBook: !!unreturnedBook,
            hasUnpaidFine: !!unpaidFine,
            unpaidFineAmount: unpaidFine?.totalFine || 0
        });
    } catch (error) {
        res.status(500).json({ message: "Error checking eligibility", error });
    }
};

/**
 * Mengambil daftar denda yang belum dibayar milik siswa yang login.
 *
 * @route  GET /api/borrow/my-fines
 * @access Siswa
 * @param  req - JWT token wajib ada
 * @param  res - 200 array peminjaman dengan denda | 401 unauthorized | 500 server error
 */
export const getMyFines = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const fines = await prisma.borrowing.findMany({
            where: {
                userId,
                totalFine: { gt: 0 },
                isPaid: false
            },
            include: {
                bookCopy: {
                    include: { book: { select: { title: true, author: true } } }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(fines);
    } catch (error) {
        res.status(500).json({ message: "Error fetching fines", error });
    }
};

/**
 * Siswa mengajukan permintaan peminjaman buku.
 * Validasi eligibilitas dilakukan sebelum membuat record peminjaman.
 * Eksemplar buku langsung di-reserve agar tidak bisa dipinjam orang lain.
 *
 * @route  POST /api/borrow
 * @access Siswa
 * @param  req - Body: { bookId }
 * @param  res - 201 data peminjaman | 400 tidak eligible/stok habis | 500 server error
 */
export const borrowBook = async (req: AuthRequest, res: Response) => {
    const { bookId } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        // Check eligibility first
        const unreturnedBook = await prisma.borrowing.findFirst({
            where: {
                userId,
                status: { in: ['BORROWED', 'RETURN_PENDING', 'PENDING'] }
            }
        });

        if (unreturnedBook) {
            return res.status(400).json({
                message: "Anda masih memiliki peminjaman yang belum selesai",
                code: "HAS_UNRETURNED_BOOK"
            });
        }

        const unpaidFine = await prisma.borrowing.findFirst({
            where: {
                userId,
                totalFine: { gt: 0 },
                isPaid: false
            }
        });

        if (unpaidFine) {
            return res.status(400).json({
                message: `Anda memiliki denda Rp ${unpaidFine.totalFine.toLocaleString('id-ID')} yang belum dibayar`,
                code: "HAS_UNPAID_FINE"
            });
        }

        // Find available copy
        const availableCopy = await prisma.bookCopy.findFirst({
            where: {
                bookId,
                status: 'AVAILABLE'
            }
        });

        if (!availableCopy) {
            return res.status(400).json({ message: "Tidak ada copy buku yang tersedia" });
        }

        // Reserve the copy to prevent double-booking
        await prisma.bookCopy.update({
            where: { id: availableCopy.id },
            data: { status: 'RESERVED' }
        });

        const borrowing = await prisma.borrowing.create({
            data: {
                userId,
                bookCopyId: availableCopy.id,
                status: 'PENDING',
                borrowDate: new Date()
            }
        });

        res.status(201).json(borrowing);
    } catch (error) {
        res.status(500).json({ message: "Error requesting borrow", error });
    }
};

/**
 * Siswa membatalkan permintaan peminjaman yang masih berstatus PENDING.
 * Eksemplar buku yang sudah di-reserve akan dikembalikan ke status AVAILABLE.
 *
 * @route  PATCH /api/borrow/:id/cancel
 * @access Siswa
 * @param  req - Params: { id }
 * @param  res - 200 pesan sukses | 400 status bukan PENDING | 403 bukan milik user | 404 tidak ditemukan
 */
export const cancelBorrow = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const borrowing = await prisma.borrowing.findUnique({
            where: { id: Number(id) },
            include: { bookCopy: true }
        });

        if (!borrowing) return res.status(404).json({ message: "Peminjaman tidak ditemukan" });

        if (borrowing.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (borrowing.status !== 'PENDING') {
            return res.status(400).json({ message: "Hanya peminjaman dengan status PENDING yang bisa dibatalkan" });
        }

        // Release the reserved copy back to AVAILABLE
        await prisma.bookCopy.update({
            where: { id: borrowing.bookCopyId },
            data: { status: 'AVAILABLE' }
        });

        // Update borrowing status to CANCELLED
        await prisma.borrowing.update({
            where: { id: Number(id) },
            data: { status: 'CANCELLED' }
        });

        res.json({ message: "Peminjaman berhasil dibatalkan" });
    } catch (error) {
        res.status(500).json({ message: "Error cancelling borrow", error });
    }
};

/**
 * Admin menyetujui atau menolak permintaan peminjaman.
 * Jika disetujui: jatuh tempo dihitung (7 hari), status BookCopy berubah ke BORROWED,
 * dan notifikasi dikirim ke siswa.
 * Jika ditolak: eksemplar kembali ke AVAILABLE dan notifikasi penolakan dikirim.
 *
 * @route  PATCH /api/borrow/:id/approve  (status: 'BORROWED')
 * @route  PATCH /api/borrow/:id/reject   (status: 'REJECTED')
 * @access Admin
 * @param  req - Params: { id }, Body: { status, rejectReason? }
 * @param  res - 200 pesan sukses | 400 status tidak valid/bukan PENDING | 404 tidak ditemukan
 */
export const handleBorrowRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectReason } = req.body; // 'BORROWED' or 'REJECTED'

    if (!['BORROWED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const borrowing = await prisma.borrowing.findUnique({
            where: { id: Number(id) },
            include: {
                bookCopy: {
                    include: { book: { select: { title: true } } }
                },
                user: { select: { username: true } }
            }
        });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.status !== 'PENDING') {
            return res.status(400).json({ message: "Only PENDING borrowings can be approved/rejected" });
        }

        const bookTitle = borrowing.bookCopy.book.title;
        const username = borrowing.user.username;

        if (status === 'BORROWED') {
            // Set due date (7 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS);

            // Pickup deadline: 2 days from now
            const pickupDeadline = new Date();
            pickupDeadline.setDate(pickupDeadline.getDate() + 2);

            // Update book copy status: RESERVED -> BORROWED
            await prisma.bookCopy.update({
                where: { id: borrowing.bookCopyId },
                data: { status: 'BORROWED' }
            });

            await prisma.borrowing.update({
                where: { id: Number(id) },
                data: {
                    status,
                    borrowDate: new Date(),
                    dueDate
                }
            });

            // Create notification for the student
            const dueDateStr = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const pickupDeadlineStr = pickupDeadline.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            await prisma.notification.create({
                data: {
                    userId: borrowing.userId,
                    title: 'Peminjaman Disetujui! ✅',
                    message: `Halo ${username}, buku "${bookTitle}" bisa diambil di perpustakaan maksimal sampai tanggal ${pickupDeadlineStr}. Jika tidak diambil, peminjaman akan hangus.\n\nBatas pengembalian: ${dueDateStr}.`,
                    type: 'BORROW_APPROVED'
                }
            });
        } else {
            // Rejected - release copy back to AVAILABLE
            await prisma.bookCopy.update({
                where: { id: borrowing.bookCopyId },
                data: { status: 'AVAILABLE' }
            });

            await prisma.borrowing.update({
                where: { id: Number(id) },
                data: {
                    status,
                    rejectReason: rejectReason || null
                }
            });

            // Create rejection notification
            await prisma.notification.create({
                data: {
                    userId: borrowing.userId,
                    title: 'Peminjaman Ditolak ❌',
                    message: `Maaf ${username}, peminjaman buku "${bookTitle}" ditolak oleh petugas.${rejectReason ? ` Alasan: ${rejectReason}` : ''}`,
                    type: 'BORROW_REJECTED'
                }
            });
        }

        res.json({ message: `Borrowing ${status.toLowerCase()}` });
    } catch (error) {
        res.status(500).json({ message: "Error handling borrow request", error });
    }
};

/**
 * Siswa mengajukan permintaan pengembalian buku.
 * Hanya bisa dilakukan jika status BORROWED dan buku sudah diambil (isPickedUp = true).
 *
 * @route  PATCH /api/borrow/:id/return
 * @access Siswa
 * @param  req - Params: { id }
 * @param  res - 200 data peminjaman terupdate | 400 kondisi tidak valid | 403 bukan milik user
 */
export const returnBookRequest = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Borrowing ID
    const userId = req.user?.userId;

    try {
        const borrowing = await prisma.borrowing.findUnique({ where: { id: Number(id) } });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.userId !== userId) return res.status(403).json({ message: "Unauthorized" });

        if (borrowing.status !== 'BORROWED') {
            return res.status(400).json({ message: "Book is not currently borrowed" });
        }

        if (!borrowing.isPickedUp) {
            return res.status(400).json({ message: "Buku belum diambil dari perpustakaan." });
        }

        const updated = await prisma.borrowing.update({
            where: { id: Number(id) },
            data: { status: 'RETURN_PENDING' }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error requesting return", error });
    }
};

/**
 * Admin menandai bahwa buku sudah diambil oleh siswa dari perpustakaan.
 * Diperlukan sebelum siswa bisa mengajukan pengembalian.
 *
 * @route  PATCH /api/borrow/:id/pickup
 * @access Admin
 * @param  req - Params: { id }
 * @param  res - 200 data peminjaman terupdate | 400 status tidak valid/sudah diambil | 404 tidak ditemukan
 */
export const markPickedUp = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const borrowing = await prisma.borrowing.findUnique({ where: { id: Number(id) } });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.status !== 'BORROWED') {
            return res.status(400).json({ message: "Status peminjaman tidak valid." });
        }

        if (borrowing.isPickedUp) {
            return res.status(400).json({ message: "Buku sudah ditandai diambil." });
        }

        const updated = await prisma.borrowing.update({
            where: { id: Number(id) },
            data: { isPickedUp: true }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error marking pickup", error });
    }
};

/**
 * Admin memverifikasi pengembalian buku dan menentukan kondisi fisiknya.
 * Denda keterlambatan dihitung otomatis. Admin bisa menambah biaya kerusakan.
 * Status BookCopy diperbarui sesuai kondisi (AVAILABLE/DAMAGED/LOST).
 *
 * @route  PATCH /api/borrow/:id/verify-return
 * @access Admin
 * @param  req - Params: { id }, Body: { status, condition, damageFee?, rejectReason? }
 * @param  res - 200 { lateFee, damageFee, totalFine, isPaid } | 400 status tidak valid | 404 tidak ditemukan
 */
export const handleReturnRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, condition, damageFee = 0, rejectReason } = req.body;
    // status: 'RETURNED' or 'BORROWED' (reject)
    // condition: 'GOOD', 'DAMAGED', 'LOST'
    // damageFee: number (for DAMAGED/LOST)

    if (!['RETURNED', 'BORROWED'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const borrowing = await prisma.borrowing.findUnique({
            where: { id: Number(id) },
            include: { bookCopy: true }
        });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.status !== 'RETURN_PENDING') {
            return res.status(400).json({ message: "Only RETURN_PENDING borrowings can be verified" });
        }

        if (status === 'RETURNED') {
            const actualReturnDate = new Date();

            // Calculate late fee
            let lateFee = 0;
            if (borrowing.dueDate) {
                lateFee = calculateLateFee(borrowing.dueDate, actualReturnDate);
            }

            const totalFine = lateFee + (damageFee || 0);
            const isPaid = totalFine === 0;

            // Update book copy status based on condition
            let copyStatus = 'AVAILABLE';
            if (condition === 'DAMAGED') copyStatus = 'DAMAGED';
            if (condition === 'LOST') copyStatus = 'LOST';

            await prisma.bookCopy.update({
                where: { id: borrowing.bookCopyId },
                data: { status: copyStatus }
            });

            await prisma.borrowing.update({
                where: { id: Number(id) },
                data: {
                    status,
                    actualReturnDate,
                    condition: condition || 'GOOD',
                    lateFee,
                    damageFee: damageFee || 0,
                    totalFine,
                    isPaid
                }
            });

            res.json({
                message: "Return processed",
                lateFee,
                damageFee: damageFee || 0,
                totalFine,
                isPaid
            });
        } else {
            // Revert to BORROWED (reject return request)
            await prisma.borrowing.update({
                where: { id: Number(id) },
                data: {
                    status,
                    rejectReason: rejectReason || null
                }
            });
            res.json({ message: "Return rejected" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error processing return", error });
    }
};

/**
 * Admin memproses pembayaran denda dari siswa.
 * Membuat record Payment dan menandai peminjaman sebagai lunas (isPaid = true).
 *
 * @route  POST /api/borrow/:id/pay-fine
 * @access Admin
 * @param  req - Params: { id }, Body: { amountPaid }
 * @param  res - 200 { totalFine, amountPaid, change } | 400 sudah dibayar/bayar kurang | 404 tidak ditemukan
 */
export const payFine = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { amountPaid } = req.body;
    const adminId = req.user?.userId;

    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const borrowing = await prisma.borrowing.findUnique({ where: { id: Number(id) } });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.totalFine === 0) {
            return res.status(400).json({ message: "No fine to pay" });
        }

        if (borrowing.isPaid) {
            return res.status(400).json({ message: "Fine already paid" });
        }

        if (amountPaid < borrowing.totalFine) {
            return res.status(400).json({
                message: `Amount paid (Rp ${amountPaid.toLocaleString('id-ID')}) is less than total fine (Rp ${borrowing.totalFine.toLocaleString('id-ID')})`
            });
        }

        const change = amountPaid - borrowing.totalFine;

        // Create payment record
        await prisma.payment.create({
            data: {
                borrowingId: borrowing.id,
                amount: borrowing.totalFine,
                amountPaid,
                change,
                paidById: adminId
            }
        });

        // Mark as paid
        await prisma.borrowing.update({
            where: { id: Number(id) },
            data: { isPaid: true }
        });

        res.json({
            message: "Payment successful",
            totalFine: borrowing.totalFine,
            amountPaid,
            change
        });
    } catch (error) {
        res.status(500).json({ message: "Error processing payment", error });
    }
};

/**
 * Mengambil daftar peminjaman. Admin melihat semua data, Siswa hanya melihat milik sendiri.
 *
 * @route  GET /api/borrow
 * @access Admin (semua) | Siswa (milik sendiri)
 * @param  req - JWT token menentukan scope data yang dikembalikan
 * @param  res - 200 array peminjaman dengan relasi user, bookCopy, payment | 500 server error
 */
export const getBorrowings = async (req: AuthRequest, res: Response) => {
    // Admin sees all, Siswa sees own
    const userId = req.user?.userId;
    const role = req.user?.role;

    try {
        let borrowings;
        if (role === 'ADMIN') {
            borrowings = await prisma.borrowing.findMany({
                include: {
                    user: { select: { username: true } },
                    bookCopy: {
                        include: { book: { select: { title: true, author: true } } }
                    },
                    payment: true
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            borrowings = await prisma.borrowing.findMany({
                where: { userId },
                include: {
                    bookCopy: {
                        include: { book: { select: { title: true, author: true } } }
                    },
                    payment: true
                },
                orderBy: { createdAt: 'desc' }
            });
        }
        res.json(borrowings);
    } catch (error) {
        res.status(500).json({ message: "Error fetching borrowings", error });
    }
};

/**
 * Mengambil rekap denda untuk dashboard Admin.
 * Menampilkan ringkasan (total lunas/belum) dan daftar semua peminjaman yang memiliki denda.
 *
 * @route  GET /api/borrow/fines-recap
 * @access Admin
 * @param  req - JWT token, role harus ADMIN
 * @param  res - 200 { summary, fines } | 403 bukan admin | 500 server error
 */
export const getFinesRecap = async (req: AuthRequest, res: Response) => {
    // Only Admin/Petugas
    const role = req.user?.role;
    if (role !== 'ADMIN') {
        return res.status(403).json({ message: "Unauthorized" });
    }

    try {
        // 1. Calculate Summary
        const paidFines = await prisma.borrowing.aggregate({
            where: { isPaid: true, totalFine: { gt: 0 } },
            _sum: { totalFine: true },
            _count: { id: true }
        });

        const unpaidFines = await prisma.borrowing.aggregate({
            where: { isPaid: false, totalFine: { gt: 0 } },
            _sum: { totalFine: true },
            _count: { id: true }
        });

        // 2. Get List of Fines (Both paid and unpaid)
        const finesList = await prisma.borrowing.findMany({
            where: { totalFine: { gt: 0 } },
            include: {
                user: { select: { username: true } },
                bookCopy: {
                    include: { book: { select: { title: true } } }
                }
            },
            orderBy: [
                { isPaid: 'asc' }, // Unpaid first
                { createdAt: 'desc' }
            ]
        });

        res.json({
            summary: {
                totalPaid: paidFines._sum.totalFine || 0,
                totalUnpaid: unpaidFines._sum.totalFine || 0,
                paidCount: paidFines._count.id || 0,
                unpaidCount: unpaidFines._count.id || 0
            },
            fines: finesList
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching fines recap", error });
    }
};
