import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// Helper: Calculate late fee (Rp 1000/day)
const LATE_FEE_PER_DAY = 1000;
const LOAN_DURATION_DAYS = 7;

const calculateLateFee = (dueDate: Date, returnDate: Date): number => {
    const diffTime = returnDate.getTime() - dueDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays * LATE_FEE_PER_DAY : 0;
};

// Check if siswa can borrow
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

// Get user's unpaid fines
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

// 1. Siswa Requests a Borrow
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

// 2. Admin Approves/Rejects Borrow
export const handleBorrowRequest = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectReason } = req.body; // 'BORROWED' or 'REJECTED'

    if (!['BORROWED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
    }

    try {
        const borrowing = await prisma.borrowing.findUnique({
            where: { id: Number(id) },
            include: { bookCopy: true }
        });
        if (!borrowing) return res.status(404).json({ message: "Borrowing not found" });

        if (borrowing.status !== 'PENDING') {
            return res.status(400).json({ message: "Only PENDING borrowings can be approved/rejected" });
        }

        if (status === 'BORROWED') {
            // Set due date (7 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + LOAN_DURATION_DAYS);

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
        }

        res.json({ message: `Borrowing ${status.toLowerCase()}` });
    } catch (error) {
        res.status(500).json({ message: "Error handling borrow request", error });
    }
};

// 3. Siswa Requests Return
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

        const updated = await prisma.borrowing.update({
            where: { id: Number(id) },
            data: { status: 'RETURN_PENDING' }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Error requesting return", error });
    }
};

// 4. Admin Approves/Rejects Return with Condition
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

// 5. Admin pays fine
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

export const getBorrowings = async (req: AuthRequest, res: Response) => {
    // Admin sees all, Siswa sees own
    const userId = req.user?.userId;
    const role = req.user?.role;

    try {
        let borrowings;
        if (role === 'ADMIN' || role === 'PETUGAS') {
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

// 6. Get Fines Recap for Admin
export const getFinesRecap = async (req: AuthRequest, res: Response) => {
    // Only Admin/Petugas
    const role = req.user?.role;
    if (role !== 'ADMIN' && role !== 'PETUGAS') {
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
