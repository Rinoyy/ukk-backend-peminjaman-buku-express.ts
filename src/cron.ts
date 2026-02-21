import cron from 'node-cron';
import prisma from './prisma';

// Run every hour
export const initCronJobs = () => {
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
};
