import cron from 'node-cron';
import prisma from './prisma';
import { PICKUP_DEADLINE_DAYS } from './utils/helpers';

// Run every hour
export const initCronJobs = () => {
    // Auto-cancel PENDING borrowings older than 24 hours
    cron.schedule('0 * * * *', async () => {
        console.log('Running auto-cancellation cron job...');
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            // Find pending borrowings older than 24h
            const expiredBorrowings = await prisma.borrowing.findMany({
                where: {
                    status: 'PENDING',
                    createdAt: {
                        lt: twentyFourHoursAgo
                    }
                },
                include: { bookCopy: true }
            });

            if (expiredBorrowings.length > 0) {
                console.log(`Found ${expiredBorrowings.length} expired bookings to cancel.`);

                for (const borrowing of expiredBorrowings) {
                    // Update borrowing status to REJECTED (auto-expired)
                    await prisma.borrowing.update({
                        where: { id: borrowing.id },
                        data: {
                            status: 'REJECTED',
                            rejectReason: 'Otomatis dibatalkan: pengajuan melebihi batas waktu 24 jam'
                        }
                    });

                    // Release reserved copy back to AVAILABLE
                    if (borrowing.bookCopy.status === 'RESERVED') {
                        await prisma.bookCopy.update({
                            where: { id: borrowing.bookCopyId },
                            data: { status: 'AVAILABLE' }
                        });
                    }

                    console.log(`Auto-cancelled borrowing ${borrowing.id}`);
                }
            } else {
                console.log('No expired bookings found.');
            }
        } catch (error) {
            console.error('Error in auto-cancellation cron:', error);
        }
    });

    // Auto-cancel BORROWED borrowings not picked up within PICKUP_DEADLINE_DAYS
    cron.schedule('0 * * * *', async () => {
        console.log('Running auto-cancel pickup deadline cron job...');
        try {
            const pickupDeadlineAgo = new Date(
                Date.now() - PICKUP_DEADLINE_DAYS * 24 * 60 * 60 * 1000
            );

            const notPickedUp = await prisma.borrowing.findMany({
                where: {
                    status: 'BORROWED',
                    isPickedUp: false,
                    borrowDate: {
                        lt: pickupDeadlineAgo
                    }
                },
                include: { bookCopy: true }
            });

            if (notPickedUp.length > 0) {
                console.log(`Found ${notPickedUp.length} approved borrowings not picked up.`);

                for (const borrowing of notPickedUp) {
                    await prisma.borrowing.update({
                        where: { id: borrowing.id },
                        data: {
                            status: 'REJECTED',
                            rejectReason: `Otomatis dibatalkan: buku tidak diambil dalam ${PICKUP_DEADLINE_DAYS} hari setelah disetujui`
                        }
                    });

                    await prisma.bookCopy.update({
                        where: { id: borrowing.bookCopyId },
                        data: { status: 'AVAILABLE' }
                    });

                    await prisma.notification.create({
                        data: {
                            userId: borrowing.userId,
                            title: 'Peminjaman Hangus ❌',
                            message: `Peminjaman buku dibatalkan otomatis karena tidak diambil dalam ${PICKUP_DEADLINE_DAYS} hari setelah disetujui.`,
                            type: 'BORROW_CANCELLED'
                        }
                    });

                    console.log(`Auto-cancelled (not picked up) borrowing ${borrowing.id}`);
                }
            } else {
                console.log('No unmatched pickup deadlines found.');
            }
        } catch (error) {
            console.error('Error in pickup deadline cron:', error);
        }
    });
};
